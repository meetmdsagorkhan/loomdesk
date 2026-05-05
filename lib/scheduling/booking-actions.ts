/**
 * Server Actions for Booking Management
 * 
 * Booking operations with race condition protection using database transactions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { z } from 'zod';
import { validateBookingSlot } from './availability-engine';
import { sendBookingConfirmationEmail, sendBookingCancellationEmail } from './email-notifications';
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent } from './google-calendar-sync';

// Validation schemas
const createBookingSchema = z.object({
  eventTypeId: z.string(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
});

const rescheduleBookingSchema = z.object({
  bookingId: z.string(),
  newStartTime: z.string().datetime(),
});

const cancelBookingSchema = z.object({
  bookingId: z.string(),
  reason: z.string().optional(),
});

/**
 * Create a new booking with race condition protection
 * Uses database transaction to ensure atomicity
 */
export async function createBooking(data: z.infer<typeof createBookingSchema>) {
  const session = await auth();
  
  const validatedData = createBookingSchema.parse(data);
  const { eventTypeId, name, email, startTime, notes } = validatedData;

  const startTimeDate = new Date(startTime);
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    include: { user: true }
  });

  if (!eventType) {
    throw new Error('Event type not found');
  }

  const endTimeDate = new Date(startTimeDate.getTime() + eventType.duration * 60000);

  // Validate the slot is still available
  const validation = await validateBookingSlot(
    eventType.user.id,
    eventTypeId,
    startTimeDate,
    endTimeDate
  );

  if (!validation.valid) {
    throw new Error(validation.reason || 'Slot not available');
  }

  // Use transaction to prevent race conditions
  const booking = await prisma.$transaction(async (tx) => {
    // Double-check availability within transaction
    const conflictingBooking = await tx.booking.findFirst({
      where: {
        eventTypeId,
        status: 'CONFIRMED',
        OR: [
          {
            AND: [
              { startTime: { lte: startTimeDate } },
              { endTime: { gt: startTimeDate } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTimeDate } },
              { endTime: { gte: endTimeDate } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTimeDate } },
              { endTime: { lte: endTimeDate } }
            ]
          }
        ]
      }
    });

    if (conflictingBooking) {
      throw new Error('This time slot was just booked. Please select another time.');
    }

    // Create the booking
    const newBooking = await tx.booking.create({
      data: {
        eventTypeId,
        name,
        email,
        startTime: startTimeDate,
        endTime: endTimeDate,
        status: 'CONFIRMED'
      },
      include: {
        eventType: {
          include: {
            user: true
          }
        }
      }
    });

    return newBooking;
  });

  // Create Google Calendar event if user has connected calendar
  try {
    const googleToken = await prisma.googleCalendarToken.findUnique({
      where: { userId: eventType.user.id }
    });

    if (googleToken) {
      const calendarEvent = await createGoogleCalendarEvent(
        eventType.user.id,
        booking.startTime,
        booking.endTime,
        `${eventType.title} with ${name}`,
        `Booking email: ${email}${notes ? '\n\nNotes: ' + notes : ''}`
      );

      // Update booking with calendar event details
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          googleCalendarEventId: calendarEvent.id,
          meetLink: calendarEvent.hangoutLink
        }
      });
    }
  } catch (error) {
    console.error('Failed to create Google Calendar event:', error);
    // Don't fail the booking if calendar sync fails
  }

  // Send confirmation emails
  try {
    await sendBookingConfirmationEmail(booking);
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    // Don't fail the booking if email fails
  }

  revalidatePath(`/book/${eventType.user.username}`);
  
  return booking;
}

/**
 * Get bookings for the current user (host)
 */
export async function getHostBookings(filters?: {
  status?: 'CONFIRMED' | 'CANCELLED';
  startDate?: Date;
  endDate?: Date;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const where: any = {
    eventType: { userId: session.user.id }
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.startDate || filters?.endDate) {
    where.startTime = {};
    if (filters.startDate) {
      where.startTime.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.startTime.lte = filters.endDate;
    }
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      eventType: {
        select: {
          title: true,
          duration: true
        }
      }
    },
    orderBy: { startTime: 'asc' }
  });

  return bookings;
}

/**
 * Get a single booking by ID
 */
export async function getBooking(bookingId: string) {
  const session = await auth();
  
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      eventType: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Check authorization: either the host or the invitee (by email)
  const isHost = session?.user?.id === booking.eventType.user.id;
  const isInvitee = session?.user?.email === booking.email;

  if (!isHost && !isInvitee) {
    throw new Error('Unauthorized');
  }

  return booking;
}

/**
 * Reschedule a booking
 */
export async function rescheduleBooking(data: z.infer<typeof rescheduleBookingSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const { bookingId, newStartTime } = data;
  const newStartTimeDate = new Date(newStartTime);

  // Get existing booking
  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      eventType: {
        include: {
          user: true
        }
      }
    }
  });

  if (!existingBooking) {
    throw new Error('Booking not found');
  }

  // Verify authorization (only host can reschedule)
  if (existingBooking.eventType.user.id !== session.user.id) {
    throw new Error('Only the host can reschedule bookings');
  }

  if (existingBooking.status === 'CANCELLED') {
    throw new Error('Cannot reschedule a cancelled booking');
  }

  const newEndTimeDate = new Date(newStartTimeDate.getTime() + existingBooking.eventType.duration * 60000);

  // Validate the new slot is available
  const validation = await validateBookingSlot(
    existingBooking.eventType.user.id,
    existingBooking.eventTypeId,
    newStartTimeDate,
    newEndTimeDate
  );

  if (!validation.valid) {
    throw new Error(validation.reason || 'New slot not available');
  }

  // Use transaction to prevent race conditions
  const updatedBooking = await prisma.$transaction(async (tx) => {
    // Double-check availability within transaction (excluding current booking)
    const conflictingBooking = await tx.booking.findFirst({
      where: {
        eventTypeId: existingBooking.eventTypeId,
        status: 'CONFIRMED',
        id: { not: bookingId },
        OR: [
          {
            AND: [
              { startTime: { lte: newStartTimeDate } },
              { endTime: { gt: newStartTimeDate } }
            ]
          },
          {
            AND: [
              { startTime: { lt: newEndTimeDate } },
              { endTime: { gte: newEndTimeDate } }
            ]
          },
          {
            AND: [
              { startTime: { gte: newStartTimeDate } },
              { endTime: { lte: newEndTimeDate } }
            ]
          }
        ]
      }
    });

    if (conflictingBooking) {
      throw new Error('This time slot was just booked. Please select another time.');
    }

    // Update the booking
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        startTime: newStartTimeDate,
        endTime: newEndTimeDate
      },
      include: {
        eventType: {
          include: {
            user: true
          }
        }
      }
    });

    return updated;
  });

  // Update Google Calendar event if exists
  if (existingBooking.googleCalendarEventId) {
    try {
      await deleteGoogleCalendarEvent(existingBooking.eventType.user.id, existingBooking.googleCalendarEventId);
      
      const newCalendarEvent = await createGoogleCalendarEvent(
        existingBooking.eventType.user.id,
        updatedBooking.startTime,
        updatedBooking.endTime,
        `${existingBooking.eventType.title} with ${existingBooking.name}`,
        `Booking email: ${existingBooking.email}`
      );

      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          googleCalendarEventId: newCalendarEvent.id,
          meetLink: newCalendarEvent.hangoutLink
        }
      });
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error);
    }
  }

  // Send reschedule notification emails
  try {
    await sendBookingConfirmationEmail(updatedBooking, true);
  } catch (error) {
    console.error('Failed to send reschedule email:', error);
  }

  revalidatePath('/dashboard/bookings');
  
  return updatedBooking;
}

/**
 * Cancel a booking
 */
export async function cancelBooking(data: z.infer<typeof cancelBookingSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const { bookingId, reason } = data;

  // Get existing booking
  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      eventType: {
        include: {
          user: true
        }
      }
    }
  });

  if (!existingBooking) {
    throw new Error('Booking not found');
  }

  // Verify authorization (host or invitee can cancel)
  const isHost = existingBooking.eventType.user.id === session.user.id;
  const isInvitee = session.user.email === existingBooking.email;

  if (!isHost && !isInvitee) {
    throw new Error('Unauthorized');
  }

  if (existingBooking.status === 'CANCELLED') {
    throw new Error('Booking is already cancelled');
  }

  // Update booking status
  const cancelledBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED'
    },
    include: {
      eventType: {
        include: {
          user: true
        }
      }
    }
  });

  // Delete from Google Calendar if exists
  if (existingBooking.googleCalendarEventId) {
    try {
      await deleteGoogleCalendarEvent(existingBooking.eventType.user.id, existingBooking.googleCalendarEventId);
    } catch (error) {
      console.error('Failed to delete Google Calendar event:', error);
    }
  }

  // Send cancellation emails
  try {
    await sendBookingCancellationEmail(cancelledBooking, reason, isHost);
  } catch (error) {
    console.error('Failed to send cancellation email:', error);
  }

  revalidatePath('/dashboard/bookings');
  
  return cancelledBooking;
}

/**
 * Get booking statistics for the dashboard
 */
export async function getBookingStats() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalBookings,
    thisMonthBookings,
    lastMonthBookings,
    upcomingBookings,
    cancelledBookings
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        eventType: { userId: session.user.id }
      }
    }),
    prisma.booking.count({
      where: {
        eventType: { userId: session.user.id },
        startTime: { gte: startOfMonth }
      }
    }),
    prisma.booking.count({
      where: {
        eventType: { userId: session.user.id },
        startTime: { gte: startOfLastMonth, lte: endOfLastMonth }
      }
    }),
    prisma.booking.count({
      where: {
        eventType: { userId: session.user.id },
        status: 'CONFIRMED',
        startTime: { gte: now }
      }
    }),
    prisma.booking.count({
      where: {
        eventType: { userId: session.user.id },
        status: 'CANCELLED'
      }
    })
  ]);

  return {
    totalBookings,
    thisMonthBookings,
    lastMonthBookings,
    upcomingBookings,
    cancelledBookings,
    growthRate: lastMonthBookings > 0 
      ? ((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100 
      : 0
  };
}

/**
 * Get event types for the current user
 */
export async function getEventTypes() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const eventTypes = await prisma.eventType.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' }
  });

  return eventTypes;
}

/**
 * Create a new event type
 */
export async function createEventType(data: {
  title: string;
  slug: string;
  description?: string;
  duration: number;
  meetLink?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const eventType = await prisma.eventType.create({
    data: {
      userId: session.user.id,
      ...data
    }
  });

  revalidatePath('/dashboard/scheduling');
  return eventType;
}

/**
 * Update an event type
 */
export async function updateEventType(id: string, data: {
  title?: string;
  slug?: string;
  description?: string;
  duration?: number;
  meetLink?: string;
  active?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const existing = await prisma.eventType.findUnique({
    where: { id }
  });

  if (!existing || existing.userId !== session.user.id) {
    throw new Error('Event type not found or unauthorized');
  }

  const eventType = await prisma.eventType.update({
    where: { id },
    data
  });

  revalidatePath('/dashboard/scheduling');
  return eventType;
}

/**
 * Delete an event type
 */
export async function deleteEventType(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const existing = await prisma.eventType.findUnique({
    where: { id }
  });

  if (!existing || existing.userId !== session.user.id) {
    throw new Error('Event type not found or unauthorized');
  }

  await prisma.eventType.delete({
    where: { id }
  });

  revalidatePath('/dashboard/scheduling');
  return { success: true };
}
