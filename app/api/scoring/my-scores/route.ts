import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [reports, activeUsers]: [
      Array<{ id: string; date: Date }>,
      Array<{ id: string }>
    ] = await Promise.all([
      prisma.report.findMany({
        where: {
          userId: session.user.id,
          status: 'SUBMITTED',
        },
        select: {
          id: true,
          date: true,
        },
        orderBy: { date: 'desc' },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
    ]);

    const reportIds = reports.map((report) => report.id);

    const [reportScoreEvents, allUserScoreEvents]: [
      Prisma.ScoreEventGetPayload<{
        select: {
          id: true;
          reportId: true;
          severity: true;
          deduction: true;
          reason: true;
          createdAt: true;
        };
      }>[], 
      Array<{ userId: string; deduction: number }>
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
      prisma.scoreEvent.findMany({
        where: {
          userId: {
            in: activeUsers.map((user) => user.id),
          },
        },
        select: {
          userId: true,
          deduction: true,
        },
      }),
    ]);

    const deductionsByReport = new Map<string, typeof reportScoreEvents>();
    const totalDeductionByUser = new Map<string, number>();

    for (const event of reportScoreEvents) {
      if (!event.reportId) {
        continue;
      }

      const group = deductionsByReport.get(event.reportId) ?? [];
      group.push(event);
      deductionsByReport.set(event.reportId, group);
    }

    for (const event of allUserScoreEvents) {
      totalDeductionByUser.set(
        event.userId,
        (totalDeductionByUser.get(event.userId) ?? 0) + event.deduction
      );
    }

    const reportsWithScores = reports.map((report) => {
      const scoreEvents = deductionsByReport.get(report.id) ?? [];
      const score = Math.max(
        0,
        100 - scoreEvents.reduce((sum, event) => sum + event.deduction, 0)
      );

      return {
        reportId: report.id,
        date: report.date,
        score,
        scoreEvents,
      };
    });

    const currentScore = Math.max(0, 100 - (totalDeductionByUser.get(session.user.id) ?? 0));
    const averageScore =
      reportsWithScores.length > 0
        ? reportsWithScores.reduce((sum, report) => sum + report.score, 0) / reportsWithScores.length
        : 100;

    const rankedUsers = activeUsers
      .map((user) => ({
        userId: user.id,
        score: Math.max(0, 100 - (totalDeductionByUser.get(user.id) ?? 0)),
      }))
      .sort((a, b) => b.score - a.score);

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
