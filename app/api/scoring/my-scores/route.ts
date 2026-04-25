import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  buildReportScoreMap,
  calculateAverageScore,
  getReportScore,
} from '@/lib/performance-metrics';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [reports, activeUsers]: [
      Array<{
        id: string;
        userId: string;
        date: Date;
        submittedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }>,
      Array<{ id: string }>
    ] = await Promise.all([
      prisma.report.findMany({
        where: {
          userId: session.user.id,
          status: 'SUBMITTED',
        },
        select: {
          id: true,
          userId: true,
          date: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { date: 'desc' },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
    ]);

    const reportIds = reports.map((report) => report.id);
    const activeUserIds = activeUsers.map((user) => user.id);

    const [reportScoreEvents, allActiveReports]: [
      Array<{
        id: string;
        reportId: string | null;
        severity: 'MINOR' | 'MAJOR';
        deduction: number;
        reason: string;
        createdAt: Date;
      }>,
      Array<{
        id: string;
        userId: string;
      }>
    ] = await Promise.all([
      prisma.scoreEvent.findMany({
        where: {
          reportId: {
            in: reportIds.length > 0 ? reportIds : ['__none__'],
          },
        },
        select: {
          id: true,
          reportId: true,
          severity: true,
          deduction: true,
          reason: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.findMany({
        where: {
          userId: {
            in: activeUserIds,
          },
          status: 'SUBMITTED',
        },
        select: {
          id: true,
          userId: true,
        },
      }),
    ]);

    const allActiveReportIds = allActiveReports.map((report) => report.id);
    const allScoreEvents = await prisma.scoreEvent.findMany({
      where: {
        reportId: {
          in: allActiveReportIds.length > 0 ? allActiveReportIds : ['__none__'],
        },
      },
      select: {
        userId: true,
        reportId: true,
        deduction: true,
        createdAt: true,
      },
    });

    const deductionsByReport = new Map<string, typeof reportScoreEvents>();
    const overallScoreMap = buildReportScoreMap(allScoreEvents);
    const personalScoreMap = buildReportScoreMap(reportScoreEvents);

    for (const event of reportScoreEvents) {
      if (!event.reportId) {
        continue;
      }

      const group = deductionsByReport.get(event.reportId) ?? [];
      group.push(event);
      deductionsByReport.set(event.reportId, group);
    }

    const reportsWithScores = reports.map((report) => {
      const scoreEvents = deductionsByReport.get(report.id) ?? [];
      const score = getReportScore(report.id, personalScoreMap);

      return {
        reportId: report.id,
        date: report.date,
        score,
        scoreEvents,
      };
    });

    const currentScore = reportsWithScores[0]?.score ?? 0;
    const averageScore = calculateAverageScore(
      reportsWithScores.map((report) => report.score)
    );

    const reportsByUser = new Map<string, number[]>();

    for (const report of allActiveReports) {
      const scores = reportsByUser.get(report.userId) ?? [];
      scores.push(getReportScore(report.id, overallScoreMap));
      reportsByUser.set(report.userId, scores);
    }

    const rankedUsers = activeUsers
      .map((user) => ({
        userId: user.id,
        score: calculateAverageScore(reportsByUser.get(user.id) ?? []),
        totalReports: (reportsByUser.get(user.id) ?? []).length,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.totalReports - a.totalReports;
      });

    const rank =
      rankedUsers.findIndex((entry) => entry.userId === session.user.id) + 1 || rankedUsers.length;

    return NextResponse.json({
      currentScore,
      totalReports: reportsWithScores.length,
      averageScore,
      rank,
      totalMembers: activeUsers.length,
      recentScores: reportsWithScores.slice(0, 5),
      scoreHistory: reportsWithScores
        .slice()
        .reverse()
        .map((report) => ({
          date: report.date,
          score: report.score,
        })),
    });
  } catch (error) {
    logger.error('Get scoring summary error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch scoring data' }, { status: 500 });
  }
}
