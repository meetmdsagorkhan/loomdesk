import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getBookingStats } from '@/lib/scheduling/booking-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getBookingStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
