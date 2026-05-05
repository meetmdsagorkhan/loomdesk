/**
 * Availability Engine
 * 
 * Core logic for generating available time slots based on:
 * - User's availability settings
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

  // Fetch user's scheduling preferences and availability
  const [preferences, availabilities, eventType, existingBookings] = await Promise.all([
    prisma.schedulingPreferences.findUnique({ where: { userId } }),
    prisma.availability.findMany({ 
      where: { userId, isAvailable: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    }),
    prisma.eventType.findUnique({ 
      where: { id: eventTypeId },
      include: { user: { select: { schedulingPreferences: true } } }
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
    const dayName = format(currentDay, 'EEEE').toUpperCase() as keyof typeof workingDays;
    
    // Skip if this day is not a working day
    if (!workingDays.includes(dayName)) {
      // Move to next day
      currentDay.setDate(currentDay.getDate() + 1);
      continue;
    }

    // Get availability for this day
    const dayAvailability = availabilityMap.get(dayName as string) || [];
    
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
 * Generate slots within a specific time range
 */
function generateSlotsInRange(params: {
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
  const {
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
  } = params;

  const slots: GeneratedSlot[] = [];
  const now = new Date();
  const minBookingTime = add(now, { minutes: minimumNotice });

  // Count bookings for this day
  const dayBookings = existingBookings.filter(booking => 
    isSameDay(booking.startTime, eventTypeDate)
  );

  if (dayBookings.length >= maxBookingsPerDay) {
    return []; // Max bookings reached for this day
  }

  // Generate potential slots
  let currentSlotStart = rangeStart;
  
  while (isBefore(currentSlotStart, rangeEnd)) {
    const currentSlotEnd = add(currentSlotStart, { minutes: slotDuration });

    // Check if slot end is beyond range end
    if (isAfter(currentSlotEnd, rangeEnd)) {
      break;
    }

    // Check minimum notice requirement
    if (isBefore(currentSlotStart, minBookingTime)) {
      currentSlotStart = add(currentSlotStart, { minutes: slotDuration });
      continue;
    }

    // Check for conflicts with existing bookings
    const hasConflict = checkBookingConflict(
      currentSlotStart,
      currentSlotEnd,
      existingBookings,
      bufferBefore,
      bufferAfter
    );

    if (!hasConflict) {
      slots.push({
        startTime: currentSlotStart.toISOString(),
        endTime: currentSlotEnd.toISOString(),
        displayTime: format(currentSlotStart, 'h:mm a', { in: tz(timezone) })
      });
    }

    // Move to next slot
    currentSlotStart = add(currentSlotStart, { minutes: slotDuration });
  }

  return slots;
}

/**
 * Check if a time slot conflicts with existing bookings
 */
function checkBookingConflict(
  slotStart: Date,
  slotEnd: Date,
  bookings: Booking[],
  bufferBefore: number,
  bufferAfter: number
): boolean {
  for (const booking of bookings) {
    const bookingStart = booking.startTime;
    const bookingEnd = booking.endTime;

    // Add buffer times to booking
    const bookingStartWithBuffer = sub(bookingStart, { minutes: bufferBefore });
    const bookingEndWithBuffer = add(bookingEnd, { minutes: bufferAfter });

    // Check for overlap
    if (
      isBefore(slotStart, bookingEndWithBuffer) && 
      isAfter(slotEnd, bookingStartWithBuffer)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Get available dates for a given month
 */
export async function getAvailableDates(
  userId: string,
  year: number,
  month: number
): Promise<Date[]> {
  const preferences = await prisma.schedulingPreferences.findUnique({
    where: { userId }
  });

  const workingDays = preferences?.workingDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const availabilities = await prisma.availability.findMany({
    where: { userId, isAvailable: true }
  });

  // Get all days that have availability set
  const daysWithAvailability = new Set(
    availabilities.map((a: any) => a.dayOfWeek)
  );

  const availableDates: Date[] = [];
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  for (let day = 1; day <= endDate.getDate(); day++) {
    const date = new Date(year, month - 1, day);
    const dayName = format(date, 'EEEE').toUpperCase();

    if (workingDays.includes(dayName) && daysWithAvailability.has(dayName)) {
      availableDates.push(date);
    }
  }

  return availableDates;
}

/**
 * Validate a booking slot before creation
 */
export async function validateBookingSlot(
  userId: string,
  eventTypeId: string,
  startTime: Date,
  endTime: Date
): Promise<{ valid: boolean; reason?: string }> {
  // Check if the slot is still available
  const existingBooking = await prisma.booking.findFirst({
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

  if (existingBooking) {
    return { valid: false, reason: 'This time slot is already booked' };
  }

  // Check minimum notice
  const preferences = await prisma.schedulingPreferences.findUnique({
    where: { userId }
  });

  if (preferences) {
    const minBookingTime = add(new Date(), { minutes: preferences.minimumNotice });
    if (isBefore(startTime, minBookingTime)) {
      return { 
        valid: false, 
        reason: `Booking must be made at least ${preferences.minimumNotice} minutes in advance` 
      };
    }
  }

  return { valid: true };
}
