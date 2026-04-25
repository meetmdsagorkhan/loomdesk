import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import { buildReportScoreMap, getReportScore } from '@/lib/performance-metrics';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: reportId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is manager or the report owner
    const isManager = isAdmin(session) || isTeamLead(session);

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        entries: {
          include: {
            feedback: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (!isManager && report.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate score for the report
    const scoreEvents = await prisma.scoreEvent.findMany({
      where: { reportId },
      select: {
        reportId: true,
        deduction: true,
      },
    });

    const feedbackAuthorIds = Array.from(
      new Set(
        report.entries.flatMap((entry) => entry.feedback.map((feedback) => feedback.authorId))
      )
    );
    const feedbackAuthors = await prisma.user.findMany({
      where: {
        id: {
          in: feedbackAuthorIds.length > 0 ? feedbackAuthorIds : ['__none__'],
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    const feedbackAuthorMap = new Map(feedbackAuthors.map((author) => [author.id, author]));
    const scoreMap = buildReportScoreMap(scoreEvents);
    const totalDeduction = scoreMap.get(reportId) ?? 0;
    const score = getReportScore(reportId, scoreMap);

    return NextResponse.json({
      ...report,
      entries: report.entries.map((entry) => ({
        ...entry,
        feedback: entry.feedback.map((feedback) => ({
          ...feedback,
          author: feedbackAuthorMap.get(feedback.authorId) ?? {
            id: feedback.authorId,
            name: 'Reviewer',
          },
        })),
      })),
      score,
      totalDeduction,
    });
  } catch (error) {
    logger.error('Get QA report error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}
