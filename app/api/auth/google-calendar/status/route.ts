import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { isGoogleOAuthConfigured } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const configured = isGoogleOAuthConfigured();

    if (!configured) {
      return NextResponse.json({ connected: false, configured: false });
    }

    const tokenRecord = await prisma.googleCalendarToken.findUnique({
      where: { userId: session.user.id },
      select: { id: true, updatedAt: true },
    });

    return NextResponse.json({
      connected: Boolean(tokenRecord),
      configured: true,
      connectedAt: tokenRecord?.updatedAt ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
