import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly

    // Admin and Team Lead can see all ratios, members can only see their own
    const isManager = session.user.role === 'ADMIN' || session.user.role === 'TEAM_LEAD';
    const targetUserId = isManager && userId ? userId : session.user.id;

    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (period === 'daily') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }

    // Fetch ticket entries for the period
    const entries = await prisma.reportEntry.findMany({
      where: {
        report: {
          userId: targetUserId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        type: 'TICKET',
      },
      include: {
        report: {
          select: {
            userId: true,
            date: true,
          },
        },
      },
    });

    const totalTickets = entries.length;
    const solvedTickets = entries.filter((e: { status: string }) => e.status === 'SOLVED').length;
    const pendingTickets = entries.filter((e: { status: string }) => e.status === 'PENDING').length;

    // Calculate ratio: (solved / total) * 100
    const ratio = totalTickets > 0 ? (solvedTickets / totalTickets) * 100 : 0;
    const isAlarming = period === 'weekly' && ratio < 90;

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalTickets,
      solvedTickets,
      pendingTickets,
      ratio: Math.round(ratio * 100) / 100, // Round to 2 decimal places
      isAlarming,
    });
  } catch (error) {
    logger.error('Ticket ratios error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch ticket ratios' }, { status: 500 });
  }
}
