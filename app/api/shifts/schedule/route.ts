import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-utils';

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

    // Admin can see all schedules, members can only see their own
    const whereClause: {
      userId?: string;
      startDate?: { lte: Date };
      endDate?: { gte: Date };
    } = isAdmin({ user: session.user })
      ? {}
      : { userId: session.user.id };

    if (userId && isAdmin({ user: session.user })) {
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
    console.error('Get schedule error:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}
