import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import {
  buildReportScoreMap,
  buildWeeklyScoreTrend,
  calculateAttendanceSummaries,
  calculateAverageScore,
  getDateRangeBounds,
  getReportScore,
} from '@/lib/performance-metrics';
import { logger } from '@/lib/logger';

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
      ? { isActive: true }
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

    const userIds = users.map((user) => user.id);

    const [reports, approvedLeaves, shiftAssignments, pendingLeaves, entries] = await Promise.all([
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
      prisma.shiftAssignment.findMany({
        where: {
          userId: { in: userIds },
          startDate: { lte: end },
          OR: [{ endDate: null }, { endDate: { gte: start } }],
        },
        select: {
          userId: true,
          startDate: true,
          endDate: true,
          shift: {
            select: {
              reportDeadline: true,
            },
          },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          userId: { in: userIds },
          status: 'PENDING',
        },
      }),
      prisma.reportEntry.findMany({
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
        select: {
          type: true,
        },
      }),
    ]);

    const reportIds = reports.map((report) => report.id);
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
    const attendance = calculateAttendanceSummaries({
      users,
      reports,
      approvedLeaves,
      shiftAssignments,
      start,
      end,
    });

    const scoresByUser = new Map<string, number[]>();

    for (const report of reports) {
      const values = scoresByUser.get(report.userId) ?? [];
      values.push(getReportScore(report.id, reportScoreMap));
      scoresByUser.set(report.userId, values);
    }

    const leaderboard = users
      .map((user) => {
        const userReports = reports.filter((report) => report.userId === user.id);
        const userScoreEvents = scoreEvents.filter((event) => event.userId === user.id);
        const userAttendance = attendance.summaries.find((summary) => summary.userId === user.id);

        return {
          name: user.name,
          reports: userReports.length,
          avgScore: calculateAverageScore(scoresByUser.get(user.id) ?? []),
          deductions: Number(
            userScoreEvents.reduce((sum, event) => sum + event.deduction, 0).toFixed(1)
          ),
          attendanceRate: userAttendance?.attendanceRate ?? 0,
        };
      })
      .sort((a, b) => {
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

    const tickets = entries.filter((entry) => entry.type === 'TICKET').length;
    const chats = entries.filter((entry) => entry.type === 'CHAT').length;
    const allScores = reports.map((report) => getReportScore(report.id, reportScoreMap));

    return NextResponse.json({
      kpi: {
        totalReports: reports.length,
        attendanceRate: attendance.overallAttendanceRate,
        avgScore: calculateAverageScore(allScores),
        totalDeductions: Number(
          scoreEvents.reduce((sum, event) => sum + event.deduction, 0).toFixed(1)
        ),
        pendingLeaves,
        activeMembers: users.length,
      },
      dailyReports,
      attendanceBreakdown: attendance.summaries.map((summary) => ({
        name: summary.name,
        present: summary.present,
        late: summary.late,
        absent: summary.absent,
        leave: summary.leave,
      })),
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
