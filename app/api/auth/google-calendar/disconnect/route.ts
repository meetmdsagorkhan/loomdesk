import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { disconnectGoogleCalendar } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await disconnectGoogleCalendar(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to disconnect Google Calendar' },
      { status: 500 }
    );
  }
}
