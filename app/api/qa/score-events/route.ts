import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { auditEvent } from '@/lib/audit-log';
import { getRequestIp, consumeRateLimitPersistent } from '@/lib/rate-limit';
import { createNotification } from '@/lib/notifications';
import { startOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

type ScoreEventSummary = {
  deduction: number;
};

const scoreEventSchema = z.object({
  userId: z.string(),
  reportId: z.string().optional(),
  entryId: z.string().optional(),
  severity: z.enum(['MINOR', 'MAJOR']),
  reason: z.string(),
  adminNote: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and TEAM_LEAD can access score events
    if (!isAdmin(session) && !isTeamLead(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const currentMonthStart = startOfMonth(new Date());

    const scoreEvents = await prisma.scoreEvent.findMany({
      where: { 
        userId,
        createdAt: {
          gte: currentMonthStart
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Calculate current score
    const totalDeduction = (scoreEvents as ScoreEventSummary[]).reduce(
      (sum, event) => sum + event.deduction,
      0
    );
    const currentScore = Math.max(0, 100 - totalDeduction);

    return NextResponse.json({
      scoreEvents,
      totalDeduction,
      currentScore,
    });
  } catch (error) {
    logger.error('Get score events error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch score events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and TEAM_LEAD can create score events
    if (!isAdmin(session) && !isTeamLead(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Apply rate limiting
    const rateLimit = await consumeRateLimitPersistent(`qa:score:${session.user.id}`, {
      limit: 15,
      windowMs: 60000, // 1 minute
      blockDurationMs: 60000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { userId, reportId, entryId, severity, reason, adminNote } = scoreEventSchema.parse(body);

    // Calculate deduction based on severity
    const deduction = severity === 'MINOR' ? 0.5 : 1.0;

    // Calculate current score for user
    const currentMonthStart = startOfMonth(new Date());
    const existingScoreEvents = await prisma.scoreEvent.findMany({
      where: { 
        userId,
        createdAt: {
          gte: currentMonthStart
        }
      },
      take: 100,
    });

    const totalDeduction = (existingScoreEvents as ScoreEventSummary[]).reduce(
      (sum, event) => sum + event.deduction,
      0
    );
    const currentScore = Math.max(0, 100 - totalDeduction);

    // Ensure score doesn't go below 0
    if (currentScore - deduction < 0) {
      return NextResponse.json({ error: 'Score cannot go below 0' }, { status: 400 });
    }

    // Create score event
    const scoreEvent = await prisma.scoreEvent.create({
      data: {
        userId,
        reportId,
        entryId,
        severity,
        deduction,
        reason,
        adminNote,
        createdById: session.user.id,
      },
    });

    // Send notification to affected member
    try {
      await createNotification({
        userId,
        type: 'SCORE_DEDUCTION',
        title: 'Score Updated',
        message: `You received a ${severity.toLowerCase()} deduction for: ${reason}`,
      });
    } catch (error) {
      logger.error('Failed to send notification for score event', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't fail the request if notification fails
    }

    return NextResponse.json(scoreEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    logger.error('Create score event error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to create score event' }, { status: 500 });
  }
}
