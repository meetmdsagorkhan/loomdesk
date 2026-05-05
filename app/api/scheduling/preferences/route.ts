import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updateSchedulingPreferences } from '@/lib/scheduling/availability-actions';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const preferencesSchema = z.object({
  timezone: z.string().optional(),
  bufferBefore: z.number().int().min(0).optional(),
  bufferAfter: z.number().int().min(0).optional(),
  minimumNotice: z.number().int().min(0).optional(),
  slotDuration: z.number().int().min(5).max(180).optional(),
  maxBookingsPerDay: z.number().int().min(1).max(50).optional(),
  workingDays: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = preferencesSchema.parse(body);

    const preferences = await updateSchedulingPreferences(data);

    return NextResponse.json(preferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Failed to update preferences:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
