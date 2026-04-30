import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import { consumeRateLimitPersistent } from '@/lib/rate-limit';
import { getRequestIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Admin and Team Lead can see all reports, members can only see their own
    const isManager = session.user.role === 'ADMIN' || session.user.role === 'TEAM_LEAD';
    const whereClause: {
      userId?: string;
      status?: 'SUBMITTED' | 'DRAFT';
      date?: Date | {
        gte: Date;
        lt: Date;
      };
    } = {};

    if (isManager) {
      if (userId) {
        whereClause.userId = userId;
      }
    } else {
      whereClause.userId = session.user.id;
    }

    if (status === 'SUBMITTED' || status === 'DRAFT') {
      whereClause.status = status;
    }

    if (date) {
      whereClause.date = new Date(date);
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
            orderBy: { createdAt: 'asc' },
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

    return NextResponse.json({
      reports,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('List reports error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimit = await consumeRateLimitPersistent(`reports:create:${session.user.id}`, {
      limit: 10,
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
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const reportDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reportDate.setHours(0, 0, 0, 0);

    if (reportDate.getTime() !== today.getTime()) {
      return NextResponse.json({ error: 'New reports can only be created for the current date' }, { status: 400 });
    }

    // Check if report already exists for this date
    const existingReport = await prisma.report.findFirst({
      where: {
        userId: session.user.id,
        date: new Date(date),
      },
    });

    if (existingReport) {
      return NextResponse.json({ error: 'Report already exists for this date' }, { status: 409 });
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        userId: session.user.id,
        date: new Date(date),
        status: 'DRAFT',
      },
      include: {
        entries: true,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    logger.error('Create report error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress,
    });
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
