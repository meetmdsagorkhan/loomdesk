/**
 * Server Actions for Availability Management
 * 
 * CRUD operations for event-specific availability settings and scheduling preferences
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schemas
const schedulingPreferencesSchema = z.object({
  eventTypeId: z.string(),
  timezone: z.string().default('UTC'),
  bufferBefore: z.number().int().min(0).default(0),
  bufferAfter: z.number().int().min(0).default(0),
  minimumNotice: z.number().int().min(0).default(60),
  slotDuration: z.number().int().min(5).max(180).default(30),
  maxBookingsPerDay: z.number().int().min(1).max(50).default(10),
  workingDays: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).default(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']),
});

const availabilitySchema = z.object({
  eventTypeId: z.string(),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format, use HH:MM'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format, use HH:MM'),
  isAvailable: z.boolean().default(true),
});

/**
 * Get scheduling preferences for an event
 */
export async function getSchedulingPreferences(eventTypeId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return await prisma.schedulingPreferences.findUnique({
    where: { eventTypeId }
  });
}

/**
 * Update or create scheduling preferences
 */
export async function updateSchedulingPreferences(data: Partial<z.infer<typeof schedulingPreferencesSchema>> & { eventTypeId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const eventType = await prisma.eventType.findUnique({ where: { id: data.eventTypeId } });
  if (!eventType || eventType.userId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  const existing = await prisma.schedulingPreferences.findUnique({
    where: { eventTypeId: data.eventTypeId }
  });

  const mergedData = {
    timezone: data.timezone ?? existing?.timezone ?? 'UTC',
    bufferBefore: data.bufferBefore ?? existing?.bufferBefore ?? 0,
    bufferAfter: data.bufferAfter ?? existing?.bufferAfter ?? 0,
    minimumNotice: data.minimumNotice ?? existing?.minimumNotice ?? 60,
    slotDuration: data.slotDuration ?? existing?.slotDuration ?? 30,
    maxBookingsPerDay: data.maxBookingsPerDay ?? existing?.maxBookingsPerDay ?? 10,
    workingDays: data.workingDays ?? existing?.workingDays ?? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  };

  const preferences = await prisma.schedulingPreferences.upsert({
    where: { eventTypeId: data.eventTypeId },
    update: mergedData,
    create: {
      userId: session.user.id,
      eventTypeId: data.eventTypeId,
      ...mergedData
    }
  });

  revalidatePath('/dashboard/scheduling');
  return preferences;
}

/**
 * Get all availability for an event
 */
export async function getAvailability(eventTypeId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return await prisma.availability.findMany({
    where: { eventTypeId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  });
}

/**
 * Create a new availability slot
 */
export async function createAvailability(data: z.infer<typeof availabilitySchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const validatedData = availabilitySchema.parse(data);

  if (validatedData.startTime >= validatedData.endTime) {
    throw new Error('End time must be after start time');
  }

  const eventType = await prisma.eventType.findUnique({ where: { id: validatedData.eventTypeId } });
  if (!eventType || eventType.userId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  const availability = await prisma.availability.create({
    data: {
      userId: session.user.id,
      ...validatedData
    }
  });

  revalidatePath('/dashboard/scheduling');
  return availability;
}

/**
 * Update an availability slot
 */
export async function updateAvailability(id: string, data: Omit<z.infer<typeof availabilitySchema>, 'eventTypeId'>) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  if (data.startTime >= data.endTime) {
    throw new Error('End time must be after start time');
  }

  const existing = await prisma.availability.findUnique({
    where: { id }
  });

  if (!existing || existing.userId !== session.user.id) {
    throw new Error('Availability not found or unauthorized');
  }

  const availability = await prisma.availability.update({
    where: { id },
    data
  });

  revalidatePath('/dashboard/scheduling');
  return availability;
}

/**
 * Delete an availability slot
 */
export async function deleteAvailability(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const existing = await prisma.availability.findUnique({
    where: { id }
  });

  if (!existing || existing.userId !== session.user.id) {
    throw new Error('Availability not found or unauthorized');
  }

  await prisma.availability.delete({
    where: { id }
  });

  revalidatePath('/dashboard/scheduling');
  return { success: true };
}

/**
 * Batch update availability for a day
 */
export async function setDayAvailability(
  eventTypeId: string,
  dayOfWeek: z.infer<typeof availabilitySchema.shape.dayOfWeek>,
  timeRanges: Array<{ startTime: string; endTime: string; isAvailable?: boolean }>
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const eventType = await prisma.eventType.findUnique({ where: { id: eventTypeId } });
  if (!eventType || eventType.userId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  await prisma.availability.deleteMany({
    where: { eventTypeId, dayOfWeek }
  });

  const availability = await Promise.all(
    timeRanges.map(range =>
      prisma.availability.create({
        data: {
          userId: session.user.id,
          eventTypeId,
          dayOfWeek,
          startTime: range.startTime,
          endTime: range.endTime,
          isAvailable: range.isAvailable ?? true
        }
      })
    )
  );

  revalidatePath('/dashboard/scheduling');
  return availability;
}

/**
 * Get availability for a specific user (public endpoint)
 */
export async function getUserPublicAvailability(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      eventTypes: {
        where: { active: true },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          duration: true,
          schedulingPreferences: true,
          availabilities: {
            where: { isAvailable: true },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
          }
        }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // We map eventTypes to also export global-like structures for backwards compatibility if needed
  return user;
}
