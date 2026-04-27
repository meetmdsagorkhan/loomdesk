import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { entryId } = body;

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    // Update the entry status to SOLVED
    const entry = await prisma.reportEntry.update({
      where: { id: entryId },
      data: { status: 'SOLVED' },
    });

    logger.info('QA entry marked as OK', { entryId, userId: session.user.id });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    logger.error('Mark OK error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to mark as OK' }, { status: 500 });
  }
}
