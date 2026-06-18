import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createEventTypeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional().nullable(),
  duration: z.number().int().min(5, "Duration must be at least 5 minutes"),
  meetLink: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  active: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eventTypes = await prisma.eventType.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ eventTypes });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch event types" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = createEventTypeSchema.parse(body);

    // Check if admin has a username set
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true },
    });

    if (!user?.username) {
      return NextResponse.json(
        { error: "You must set a username in your profile before creating event types." },
        { status: 400 }
      );
    }

    // Check slug uniqueness for this user
    const existing = await prisma.eventType.findUnique({
      where: { userId_slug: { userId: session.user.id, slug: data.slug } },
    });
    if (existing) {
      return NextResponse.json({ error: "You already have an event type with this slug." }, { status: 400 });
    }

    const eventType = await prisma.eventType.create({
      data: {
        ...data,
        meetLink: data.meetLink || null,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ eventType }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create event type" }, { status: 500 });
  }
}
