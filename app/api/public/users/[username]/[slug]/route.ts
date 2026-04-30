import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Returns event type details AND already-booked slots for a given date range
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; slug: string }> }
) {
  try {
    const { username, slug } = await params;
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date"); // YYYY-MM-DD

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, name: true, image: true, position: true, company: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const eventType = await prisma.eventType.findUnique({
      where: { userId_slug: { userId: user.id, slug } },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        duration: true,
        active: true,
      },
    });

    if (!eventType || !eventType.active) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 });
    }

    // If a date is provided, return booked slots for that day
    let bookedSlots: { startTime: Date; endTime: Date }[] = [];
    if (dateStr) {
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

      bookedSlots = await prisma.booking.findMany({
        where: {
          eventTypeId: eventType.id,
          status: "CONFIRMED",
          startTime: { gte: dayStart, lte: dayEnd },
        },
        select: { startTime: true, endTime: true },
      });
    }

    return NextResponse.json({ eventType, host: user, bookedSlots });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch event type" }, { status: 500 });
  }
}
