import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import { buildReportScoreMap, getReportScore } from '@/lib/performance-metrics';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is manager
    const isManager = isAdmin(session) || isTeamLead(session);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status'); // 'SUBMITTED', 'DRAFT', or 'all'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // If not manager, strictly limit to their own reports
    if (!isManager && userId && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const whereClause: {
      status?: 'SUBMITTED' | 'DRAFT';
      date?: { gte: Date; lt: Date };
      userId?: string;
    } = {
      status: 'SUBMITTED', // Only show submitted reports in QA
    };

    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause.date = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    if (userId && isManager) {
      whereClause.userId = userId;
    } else if (!isManager) {
      whereClause.userId = session.user.id;
    }

    if (status === 'SUBMITTED' || status === 'DRAFT') {
      whereClause.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: whereClause,
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
          },
          _count: {
            select: { entries: true },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.report.count({ where: whereClause }),
    ]);

    // Calculate score for each report (100 - total deductions)
    const reportIds = reports.map((report) => report.id);
    const scoreEvents = await prisma.scoreEvent.findMany({
      where: {
        reportId: { in: reportIds.length > 0 ? reportIds : ['__none__'] },
      },
      select: {
        reportId: true,
        deduction: true,
      },
    });
    const scoreMap = buildReportScoreMap(scoreEvents);

    const reportsWithScore = reports.map((report) => {
      return {
        ...report,
        score: getReportScore(report.id, scoreMap),
      };
    });

    return NextResponse.json({
      reports: reportsWithScore,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('List QA reports error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
