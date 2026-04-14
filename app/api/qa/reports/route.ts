import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and TEAM_LEAD can access QA routes
    if (!isAdmin(session) && !isTeamLead(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status'); // 'SUBMITTED', 'DRAFT', or 'all'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const whereClause: any = {
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

    if (userId) {
      whereClause.userId = userId;
    }

    if (status && status !== 'all') {
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
    const reportIds = reports.map((r: any) => r.id);
    const scoreEvents = await prisma.scoreEvent.findMany({
      where: {
        reportId: { in: reportIds },
      },
    });

    const scoreMap = new Map<string, number>();
    scoreEvents.forEach((event: any) => {
      const currentScore = scoreMap.get(event.reportId || '') || 0;
      scoreMap.set(event.reportId || '', currentScore + event.deduction);
    });

    const reportsWithScore = reports.map((report: any) => {
      const totalDeduction = scoreMap.get(report.id) || 0;
      return {
        ...report,
        score: Math.max(0, 100 - totalDeduction),
      };
    });

    return NextResponse.json({
      reports: reportsWithScore,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('List QA reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
