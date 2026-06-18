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

    // Check if report exists and is in SUBMITTED status
    const existingReport = await prisma.report.findUnique({
      where: { id: reportId },
      select: { status: true },
    });

    if (!existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (existingReport.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Only submitted reports can be marked as reviewed' }, { status: 400 });
    }

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
