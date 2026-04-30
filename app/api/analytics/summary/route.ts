import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import { Role } from '@prisma/client';
import {
  buildReportScoreMap,
  buildWeeklyScoreTrend,
  calculateAverageScore,
  getDateRangeBounds,
  getReportScore,
} from '@/lib/performance-metrics';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canViewTeamAnalytics = isAdmin(session) || isTeamLead(session);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const { start, end } = getDateRangeBounds(
      startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate) : new Date()
    );

    const userWhere = canViewTeamAnalytics
      ? { isActive: true, role: { not: Role.ADMIN } }
      : { id: session.user.id, isActive: true };

    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const userIds = users.map((user: { id: string }) => user.id);

    const [reports, approvedLeaves, pendingLeaves, entries] = await Promise.all([
      prisma.report.findMany({
        where: {
          userId: { in: userIds },
          status: 'SUBMITTED',
          date: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          userId: true,
          date: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          date: 'asc',
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: { in: userIds },
          status: 'APPROVED',
          OR: [
            { startDate: { gte: start, lte: end } },
            { endDate: { gte: start, lte: end } },
            { startDate: { lte: start }, endDate: { gte: end } },
          ],
        },
        select: {
          userId: true,
          startDate: true,
          endDate: true,
        },
      }),
      prisma.leaveRequest.count({
        where: {
          userId: { in: userIds },
          status: 'PENDING',
        },
      }),
      prisma.reportEntry.groupBy({
        by: ['type'],
        where: {
          report: {
            userId: { in: userIds },
            status: 'SUBMITTED',
            date: {
              gte: start,
              lte: end,
            },
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const reportIds = reports.map((report: { id: string }) => report.id);
    const scoreEvents = await prisma.scoreEvent.findMany({
      where: {
        userId: { in: userIds },
        reportId: {
          in: reportIds.length > 0 ? reportIds : ['__none__'],
        },
      },
      select: {
        userId: true,
        reportId: true,
        deduction: true,
        createdAt: true,
      },
    });

    const reportScoreMap = buildReportScoreMap(scoreEvents);

    const scoresByUser = new Map<string, number[]>();

    for (const report of reports) {
      const values = scoresByUser.get(report.userId) ?? [];
      values.push(getReportScore(report.id, reportScoreMap));
      scoresByUser.set(report.userId, values);
    }

    const leaderboard = users
      .map((user: { id: string; name: string }) => {
        const userReports = reports.filter((report: { userId: string }) => report.userId === user.id);
        const userScoreEvents = scoreEvents.filter((event: { userId: string }) => event.userId === user.id);

        return {
          name: user.name,
          reports: userReports.length,
          avgScore: calculateAverageScore(scoresByUser.get(user.id) ?? []),
          deductions: Number(
            userScoreEvents.reduce((sum: number, event: { deduction: number }) => sum + event.deduction, 0).toFixed(1)
          ),
        };
      })
      .sort((a: { avgScore: number; reports: number; name: string }, b: { avgScore: number; reports: number; name: string }) => {
        if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
        if (b.reports !== a.reports) return b.reports - a.reports;
        return a.name.localeCompare(b.name);
      });

    const dailyReportsMap = new Map<string, number>();

    for (const report of reports) {
      const dateKey = report.date.toISOString().split('T')[0];
      dailyReportsMap.set(dateKey, (dailyReportsMap.get(dateKey) ?? 0) + 1);
    }

    const dailyReports: Array<{ date: string; count: number }> = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyReports.push({
        date: dateKey,
        count: dailyReportsMap.get(dateKey) ?? 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const tickets = entries.find((e: { type: string; _count: { _all: number } }) => e.type === 'TICKET')?._count._all ?? 0;
    const chats = entries.find((e: { type: string; _count: { _all: number } }) => e.type === 'CHAT')?._count._all ?? 0;
    const allScores = reports.map((report: { id: string }) => getReportScore(report.id, reportScoreMap));

    return NextResponse.json({
      kpi: {
        totalReports: reports.length,
        avgScore: calculateAverageScore(allScores),
        totalDeductions: Number(
          scoreEvents.reduce((sum: number, event: { deduction: number }) => sum + event.deduction, 0).toFixed(1)
        ),
        pendingLeaves,
        activeMembers: users.length,
      },
      dailyReports,
      weeklyScoreTrend: buildWeeklyScoreTrend({
        reports,
        scoreMap: reportScoreMap,
        start,
        end,
      }),
      entryDistribution: {
        tickets,
        chats,
      },
      leaderboard,
    });
  } catch (error) {
    logger.error('Analytics summary error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch analytics summary' }, { status: 500 });
  }
}
