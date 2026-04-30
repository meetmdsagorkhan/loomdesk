import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createMeetEvent } from "@/lib/google-calendar";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const createBookingSchema = z.object({
  eventTypeId: z.string().min(1),
  name: z.string().min(1, "Your name is required"),
  email: z.string().email("A valid email is required"),
  startTime: z.string().datetime("Invalid start time"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createBookingSchema.parse(body);

    const eventType = await prisma.eventType.findUnique({
      where: { id: data.eventTypeId },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        active: true,
        meetLink: true,     // static fallback
        userId: true,       // for Google Calendar auth
        user: {
          select: {
            name: true,
            googleCalendarToken: { select: { id: true } }, // check if connected
          },
        },
      },
    });

    if (!eventType || !eventType.active) {
      return NextResponse.json({ error: "Event type not found or inactive" }, { status: 404 });
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(startTime.getTime() + eventType.duration * 60 * 1000);

    // Check for conflicts
    const conflict = await prisma.booking.findFirst({
      where: {
        eventTypeId: data.eventTypeId,
        status: "CONFIRMED",
        OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }],
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "This time slot is no longer available. Please choose another." },
        { status: 409 }
      );
    }

    // Attempt to create a dynamic Google Meet link via Calendar API
    let meetLink: string | null = eventType.meetLink ?? null;
    let googleCalendarEventId: string | null = null;

    if (eventType.user.googleCalendarToken) {
      try {
        const meetEvent = await createMeetEvent({
          hostUserId: eventType.userId,
          title: `${eventType.title} with ${data.name}`,
          description: eventType.description,
          guestName: data.name,
          guestEmail: data.email,
          startTime,
          endTime,
        });
        meetLink = meetEvent.meetLink;
        googleCalendarEventId = meetEvent.googleCalendarEventId;
      } catch (calendarError: any) {
        // Log but don't fail the booking — fall back to static link
        logger.error("Google Calendar event creation failed", {
          error: calendarError?.message ?? String(calendarError),
          eventTypeId: data.eventTypeId,
        });
      }
    }

    const booking = await prisma.booking.create({
      data: {
        eventTypeId: data.eventTypeId,
        name: data.name,
        email: data.email,
        startTime,
        endTime,
        status: "CONFIRMED",
        meetLink,
        googleCalendarEventId,
      },
      include: {
        eventType: {
          select: {
            title: true,
            duration: true,
            user: { select: { name: true, username: true } },
          },
        },
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Booking creation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
