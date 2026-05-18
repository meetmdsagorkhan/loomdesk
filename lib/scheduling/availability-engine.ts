/**
 * Availability Engine
 * 
 * Core logic for generating available time slots based on:
 * - Event's availability settings
 * - Existing bookings
 * - Timezone differences
 * - Buffer times
 * - Minimum notice requirements
 */

import { 
  add, 
  sub, 
  isBefore, 
  isAfter, 
  isEqual, 
  startOfDay, 
  endOfDay, 
  setHours, 
  setMinutes, 
  differenceInMinutes,
  format,
  parseISO,
  isSameDay,
  isWithinInterval
} from 'date-fns';
import { tz } from '@date-fns/tz';
import { prisma } from '@/lib/db';
import type { Availability, Booking, SchedulingPreferences, EventType } from '@prisma/client';

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  reason?: string;
}

export interface AvailabilityRequest {
  userId: string;
  eventTypeId: string;
  startDate: Date;
  endDate: Date;
  timezone?: string;
}

export interface GeneratedSlot {
  startTime: string; // ISO string
  endTime: string; // ISO string
  displayTime: string; // formatted for display
}

/**
 * Generate available time slots for a given date range
 */
export async function getAvailableSlots(request: AvailabilityRequest): Promise<GeneratedSlot[]> {
  const { userId, eventTypeId, startDate, endDate, timezone = 'UTC' } = request;

  // Fetch event's scheduling preferences and availability
  const [preferences, availabilities, eventType, existingBookings] = await Promise.all([
    prisma.schedulingPreferences.findUnique({ where: { eventTypeId } }),
    prisma.availability.findMany({ 
      where: { eventTypeId, isAvailable: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    }),
    prisma.eventType.findUnique({ 
      where: { id: eventTypeId }
    }),
    prisma.booking.findMany({
      where: {
        eventTypeId,
        status: 'CONFIRMED',
        startTime: { gte: startDate },
        endTime: { lte: endDate }
      }
    })
  ]);

  if (!eventType) {
    throw new Error('Event type not found');
  }

  const userTimezone = preferences?.timezone || 'UTC';
  const slotDuration = eventType.duration || preferences?.slotDuration || 30;
  const bufferBefore = preferences?.bufferBefore || 0;
  const bufferAfter = preferences?.bufferAfter || 0;
  const minimumNotice = preferences?.minimumNotice || 60;
  const maxBookingsPerDay = preferences?.maxBookingsPerDay || 10;
  const workingDays = preferences?.workingDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  // Create a map of day of week to availability ranges
  const availabilityMap = new Map<string, Array<{ start: string; end: string }>>();
  availabilities.forEach((avail: any) => {
    if (!availabilityMap.has(avail.dayOfWeek)) {
      availabilityMap.set(avail.dayOfWeek, []);
    }
    availabilityMap.get(avail.dayOfWeek)!.push({
      start: avail.startTime,
      end: avail.endTime
    });
  });

  // Generate slots for each day in the range
  const slots: GeneratedSlot[] = [];
  const currentDay = startOfDay(startDate);
  const lastDay = endOfDay(endDate);

  while (isBefore(currentDay, lastDay) || isEqual(currentDay, lastDay)) {
    const dayName = format(currentDay, 'EEEE').toUpperCase();
    
    // Skip if this day is not a working day
    if (!workingDays.includes(dayName)) {
      // Move to next day
      currentDay.setDate(currentDay.getDate() + 1);
      continue;
    }

    // Get availability for this day
    const dayAvailability = availabilityMap.get(dayName) || [];
    
    if (dayAvailability.length === 0) {
      // No availability set for this day, skip
      currentDay.setDate(currentDay.getDate() + 1);
      continue;
    }

    // Generate slots for each availability range
    for (const range of dayAvailability) {
      const [startHour, startMin] = range.start.split(':').map(Number);
      const [endHour, endMin] = range.end.split(':').map(Number);

      // Create start and end times in user's timezone
      const rangeStart = setHours(setMinutes(currentDay, startMin), startHour);
      const rangeEnd = setHours(setMinutes(currentDay, endMin), endHour);

      // Generate slots within this range
      const daySlots = generateSlotsInRange({
        rangeStart,
        rangeEnd,
        slotDuration,
        bufferBefore,
        bufferAfter,
        minimumNotice,
        existingBookings,
        maxBookingsPerDay,
        timezone: userTimezone,
        eventTypeDate: currentDay
      });

      slots.push(...daySlots);
    }

    // Move to next day
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return slots;
}

/**
 * Validate a specific booking slot
 */
export async function validateBookingSlot(
  userId: string,
  eventTypeId: string,
  startTime: Date,
  endTime: Date
): Promise<{ valid: boolean; reason?: string }> {
  // Get all slots for that day to check if this slot exists
  const dayStart = startOfDay(startTime);
  const dayEnd = endOfDay(startTime);

  const availableSlots = await getAvailableSlots({
    userId,
    eventTypeId,
    startDate: dayStart,
    endDate: dayEnd
  });

  const startTimeIso = startTime.toISOString();
  const endTimeIso = endTime.toISOString();

  // Find exact matching slot
  const slotExists = availableSlots.some(
    slot => slot.startTime === startTimeIso && slot.endTime === endTimeIso
  );

  if (!slotExists) {
    return { valid: false, reason: 'This time slot is no longer available or invalid.' };
  }

  // Check for any conflicting bookings that might have sneaked in
  const conflict = await prisma.booking.findFirst({
    where: {
      eventTypeId,
      status: 'CONFIRMED',
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } }
          ]
        },
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } }
          ]
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } }
          ]
        }
      ]
    }
  });

  if (conflict) {
    return { valid: false, reason: 'This time slot was just booked.' };
  }

  return { valid: true };
}

/**
 * Helper to generate time slots within a specific time range
 */
function generateSlotsInRange({
  rangeStart,
  rangeEnd,
  slotDuration,
  bufferBefore,
  bufferAfter,
  minimumNotice,
  existingBookings,
  maxBookingsPerDay,
  timezone,
  eventTypeDate
}: {
  rangeStart: Date;
  rangeEnd: Date;
  slotDuration: number;
  bufferBefore: number;
  bufferAfter: number;
  minimumNotice: number;
  existingBookings: Booking[];
  maxBookingsPerDay: number;
  timezone: string;
  eventTypeDate: Date;
}): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];
  const now = new Date();
  
  // Calculate earliest possible booking time based on minimum notice
  const earliestBookingTime = add(now, { minutes: minimumNotice });

  // Count bookings for this day
  const bookingsForDay = existingBookings.filter(b => 
    isSameDay(b.startTime, eventTypeDate)
  ).length;

  // If max bookings per day reached, return empty
  if (bookingsForDay >= maxBookingsPerDay) {
    return slots;
  }

  // Start with the range start time
  let currentSlotStart = rangeStart;

  while (isBefore(currentSlotStart, rangeEnd)) {
    const currentSlotEnd = add(currentSlotStart, { minutes: slotDuration });
    
    // Stop if the end of this slot goes past the end of the range
    if (isAfter(currentSlotEnd, rangeEnd)) {
      break;
    }

    // Include buffers for availability checking
    const slotStartWithBuffer = sub(currentSlotStart, { minutes: bufferBefore });
    const slotEndWithBuffer = add(currentSlotEnd, { minutes: bufferAfter });

    // Check if slot is in the past or violates minimum notice
    if (isBefore(currentSlotStart, earliestBookingTime)) {
      currentSlotStart = add(currentSlotStart, { minutes: slotDuration });
      continue;
    }

    // Check for conflicts with existing bookings
    const hasConflict = existingBookings.some(booking => {
      // Check if the buffered slot overlaps with the booking
      // A booking conflicts if it overlaps with [slotStartWithBuffer, slotEndWithBuffer]
      return (
        (isAfter(booking.startTime, slotStartWithBuffer) && isBefore(booking.startTime, slotEndWithBuffer)) || // booking starts during slot
        (isAfter(booking.endTime, slotStartWithBuffer) && isBefore(booking.endTime, slotEndWithBuffer)) ||     // booking ends during slot
        (isBefore(booking.startTime, slotStartWithBuffer) && isAfter(booking.endTime, slotEndWithBuffer)) ||   // booking completely covers slot
        isEqual(booking.startTime, slotStartWithBuffer) ||                                                     // exact match start
        isEqual(booking.endTime, slotEndWithBuffer)                                                            // exact match end
      );
    });

    if (!hasConflict) {
      slots.push({
        startTime: currentSlotStart.toISOString(),
        endTime: currentSlotEnd.toISOString(),
        displayTime: format(currentSlotStart, 'h:mm a')
      });
    }

    // Move to next potential slot start time
    // For simplicity, we advance by the slot duration. 
    // For more complex scheduling, this might advance by a smaller interval (e.g. 15 mins)
    currentSlotStart = add(currentSlotStart, { minutes: slotDuration });
  }

  return slots;
}
