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

    // Check if the entry exists and if the associated report is in SUBMITTED status
    const entry = await prisma.reportEntry.findUnique({
      where: { id: entryId },
      include: {
        report: {
          select: { status: true },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (entry.report.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Only entries from submitted reports can be marked as OK' }, { status: 400 });
    }

    // Update the entry status to SOLVED
    const updatedEntry = await prisma.reportEntry.update({
      where: { id: entryId },
      data: { status: 'SOLVED' },
    });

    logger.info('QA entry marked as OK', { entryId, userId: session.user.id });

    return NextResponse.json({ success: true, entry: updatedEntry });
  } catch (error) {
    logger.error('Mark OK error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to mark as OK' }, { status: 500 });
  }
}
