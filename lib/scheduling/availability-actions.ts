/**
 * Server Actions for Availability Management
 * 
 * CRUD operations for user availability settings and scheduling preferences
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schemas
const schedulingPreferencesSchema = z.object({
  timezone: z.string().default('UTC'),
  bufferBefore: z.number().int().min(0).default(0),
  bufferAfter: z.number().int().min(0).default(0),
  minimumNotice: z.number().int().min(0).default(60),
  slotDuration: z.number().int().min(5).max(180).default(30),
  maxBookingsPerDay: z.number().int().min(1).max(50).default(10),
  workingDays: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).default(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']),
});

const availabilitySchema = z.object({
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format, use HH:MM'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format, use HH:MM'),
  isAvailable: z.boolean().default(true),
});

/**
 * Get user's scheduling preferences
 */
export async function getSchedulingPreferences() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const preferences = await prisma.schedulingPreferences.findUnique({
    where: { userId: session.user.id }
  });

  return preferences;
}

/**
 * Update or create scheduling preferences
 */
export async function updateSchedulingPreferences(data: z.infer<typeof schedulingPreferencesSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const validatedData = schedulingPreferencesSchema.parse(data);

  const preferences = await prisma.schedulingPreferences.upsert({
    where: { userId: session.user.id },
    update: validatedData,
    create: {
      userId: session.user.id,
      ...validatedData
    }
  });

  revalidatePath('/dashboard/scheduling');
  return preferences;
}

/**
 * Get all availability for a user
 */
export async function getAvailability() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const availability = await prisma.availability.findMany({
    where: { userId: session.user.id },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  });

  return availability;
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

  // Validate that end time is after start time
  if (validatedData.startTime >= validatedData.endTime) {
    throw new Error('End time must be after start time');
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
export async function updateAvailability(id: string, data: z.infer<typeof availabilitySchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const validatedData = availabilitySchema.parse(data);

  // Validate that end time is after start time
  if (validatedData.startTime >= validatedData.endTime) {
    throw new Error('End time must be after start time');
  }

  // Verify ownership
  const existing = await prisma.availability.findUnique({
    where: { id }
  });

  if (!existing || existing.userId !== session.user.id) {
    throw new Error('Availability not found or unauthorized');
  }

  const availability = await prisma.availability.update({
    where: { id },
    data: validatedData
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

  // Verify ownership
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
 * Replaces all availability for a specific day of week
 */
export async function setDayAvailability(
  dayOfWeek: z.infer<typeof availabilitySchema.shape.dayOfWeek>,
  timeRanges: Array<{ startTime: string; endTime: string; isAvailable?: boolean }>
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Delete existing availability for this day
  await prisma.availability.deleteMany({
    where: {
      userId: session.user.id,
      dayOfWeek
    }
  });

  // Create new availability slots
  const availability = await Promise.all(
    timeRanges.map(range =>
      prisma.availability.create({
        data: {
          userId: session.user.id,
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
      schedulingPreferences: true,
      availability: {
        where: { isAvailable: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      },
      eventTypes: {
        where: { active: true },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          duration: true
        }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}
