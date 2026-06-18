import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { deleteMeetEvent } from "@/lib/google-calendar";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!["CONFIRMED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        eventType: {
          select: {
            userId: true,
            user: {
              select: { googleCalendarToken: { select: { id: true } } },
            },
          },
        },
      },
    });

    if (!booking || booking.eventType.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // If cancelling and there's a Google Calendar event, delete it
    if (status === "CANCELLED" && booking.googleCalendarEventId && booking.eventType.user.googleCalendarToken) {
      try {
        await deleteMeetEvent(session.user.id, booking.googleCalendarEventId);
      } catch (calendarError: any) {
        // Log but don't block the cancellation
        logger.error("Failed to delete Google Calendar event", {
          error: calendarError?.message ?? String(calendarError),
          bookingId: id,
          googleCalendarEventId: booking.googleCalendarEventId,
        });
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ booking: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
