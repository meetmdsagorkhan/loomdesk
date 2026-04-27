import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import { createNotification } from '@/lib/notifications';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: reportId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify report belongs to user
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        entries: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (report.status === 'SUBMITTED') {
      return NextResponse.json({ error: 'Report already submitted' }, { status: 400 });
    }

    if (report.entries.length === 0) {
      return NextResponse.json({ error: 'Cannot submit empty report' }, { status: 400 });
    }

    // Submit report
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Notify admins and team leads about new report submission
    try {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'TEAM_LEAD'] },
          isActive: true,
        },
        select: { id: true },
      });

      const reportDate = format(new Date(report.date), 'MMM d, yyyy');

      for (const manager of managers) {
        await createNotification({
          userId: manager.id,
          type: 'NEW_REPORT',
          title: 'New Report Submitted',
          message: `${session.user.name} submitted their report for ${reportDate}.`,
        });
      }
    } catch (error) {
      logger.error('Failed to send report submission notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't fail the request if notification fails
    }

    return NextResponse.json(updatedReport);
  } catch (error) {
    logger.error('Submit report error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
