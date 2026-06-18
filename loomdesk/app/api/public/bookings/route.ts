import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/scheduling/booking-actions";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const createBookingSchema = z.object({
  eventTypeId: z.string().min(1),
  name: z.string().min(1, "Your name is required"),
  email: z.string().email("A valid email is required"),
  startTime: z.string().datetime("Invalid start time"),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createBookingSchema.parse(body);

    // Use the server action with race condition protection
    const booking = await createBooking(data);

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Booking creation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Failed to create booking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
