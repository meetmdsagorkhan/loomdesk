import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    // Admin/Lead can see all schedules, members can only see their own
    const whereClause: {
      userId?: string;
      startDate?: { lte: Date };
      endDate?: { gte: Date };
    } = isTeamLead(session)
      ? {}
      : { userId: session.user.id };

    if (userId && isTeamLead(session)) {
      whereClause.userId = userId;
    }

    if (startDate && endDate) {
      whereClause.startDate = { lte: new Date(endDate) };
      whereClause.endDate = { gte: new Date(startDate) };
    }

    const assignments = await prisma.shiftAssignment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shift: true,
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    logger.error('Get schedule error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}
