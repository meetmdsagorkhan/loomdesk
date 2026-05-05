import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAvailability, getSchedulingPreferences } from '@/lib/scheduling/availability-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [availability, preferences] = await Promise.all([
      getAvailability(),
      getSchedulingPreferences()
    ]);

    return NextResponse.json({ availability, preferences });
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
