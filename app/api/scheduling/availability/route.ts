import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAvailability, getSchedulingPreferences, createAvailability } from '@/lib/scheduling/availability-actions';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const availabilitySchema = z.object({
  eventTypeId: z.string(),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  isAvailable: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventTypeId = searchParams.get('eventTypeId');

    if (!eventTypeId) {
      return NextResponse.json({ error: 'eventTypeId is required' }, { status: 400 });
    }

    const [availability, preferences] = await Promise.all([
      getAvailability(eventTypeId),
      getSchedulingPreferences(eventTypeId)
    ]);

    return NextResponse.json({ availability, preferences });
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = availabilitySchema.parse(body);

    // Validate end time is after start time
    if (data.startTime >= data.endTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    const availability = await createAvailability(data);

    return NextResponse.json(availability, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Failed to create availability:', error);
    return NextResponse.json({ error: 'Failed to create availability' }, { status: 500 });
  }
}
