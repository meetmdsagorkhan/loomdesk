import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "CONFIRMED";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 20;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: {
          eventType: { userId: session.user.id },
          ...(status !== "ALL" ? { status: status as "CONFIRMED" | "CANCELLED" } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          startTime: true,
          endTime: true,
          status: true,
          meetLink: true,
          googleCalendarEventId: true,
          eventType: { select: { title: true, duration: true, meetLink: true, slug: true } },
        },
        orderBy: { startTime: "asc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({
        where: {
          eventType: { userId: session.user.id },
          ...(status !== "ALL" ? { status: status as "CONFIRMED" | "CANCELLED" } : {}),
        },
      }),
    ]);

    return NextResponse.json({ bookings, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
