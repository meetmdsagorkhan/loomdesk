import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

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

    const scoreEvents = await prisma.scoreEvent.findMany({
      where: { userId },
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
    });

    // Calculate current score
    const totalDeduction = scoreEvents.reduce((sum: number, event: any) => sum + event.deduction, 0);
    const currentScore = Math.max(0, 100 - totalDeduction);

    return NextResponse.json({
      scoreEvents,
      totalDeduction,
      currentScore,
    });
  } catch (error) {
    console.error('Get score events error:', error);
    return NextResponse.json({ error: 'Failed to fetch score events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and TEAM_LEAD can create score events
    if (!isAdmin(session) && !isTeamLead(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, reportId, entryId, severity, reason, adminNote } = scoreEventSchema.parse(body);

    // Calculate deduction based on severity
    const deduction = severity === 'MINOR' ? 0.5 : 1.0;

    // Calculate current score for user
    const existingScoreEvents = await prisma.scoreEvent.findMany({
      where: { userId },
    });

    const totalDeduction = existingScoreEvents.reduce((sum: number, event: any) => sum + event.deduction, 0);
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
      if (supabase) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'SCORE_DEDUCTION',
          title: 'Score Deduction',
          message: `You received a ${severity.toLowerCase()} deduction: ${reason}`,
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(scoreEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Create score event error:', error);
    return NextResponse.json({ error: 'Failed to create score event' }, { status: 500 });
  }
}
