import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and TEAM_LEAD can mark reports as reviewed
    if (!isAdmin(session) && !isTeamLead(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const { id: reportId } = params;

    // Update report status to REVIEWED
    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status: 'REVIEWED' },
    });

    logger.info('Report marked as reviewed', { reportId, userId: session.user.id });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    logger.error('Mark as reviewed error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to mark as reviewed' }, { status: 500 });
  }
}
