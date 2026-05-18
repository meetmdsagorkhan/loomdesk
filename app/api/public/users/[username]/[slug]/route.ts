import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAvailableSlots } from "@/lib/scheduling/availability-engine";

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

    const availabilities = await prisma.availability.findMany({
      where: { eventTypeId: eventType.id, isAvailable: true },
      select: { dayOfWeek: true }
    });

    const dayMap: Record<string, number> = {
      SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
    };
    const availableDays = [...new Set(availabilities.map(a => dayMap[a.dayOfWeek]))];

    // If a date is provided, return available slots for that day using the engine
    let availableSlots: { startTime: string; endTime: string; displayTime: string }[] = [];
    let bookedSlots: { startTime: Date; endTime: Date }[] = []; // kept for backwards compatibility if needed, though we probably don't need it

    if (dateStr) {
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

      availableSlots = await getAvailableSlots({
        userId: user.id,
        eventTypeId: eventType.id,
        startDate: dayStart,
        endDate: dayEnd,
        timezone: "UTC" // The engine will format to the user's timezone implicitly via preferences
      });
    }

    return NextResponse.json({ eventType, host: user, availableDays, availableSlots, bookedSlots });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch event type" }, { status: 500 });
  }
}
