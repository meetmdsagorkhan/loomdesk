import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-utils';
import { z } from 'zod';

const leaveRequestSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(1, 'Reason is required'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    // Admin can see all requests, members can only see their own
    const whereClause: any = isAdmin({ user: session.user })
      ? {}
      : { userId: session.user.id };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (userId && isAdmin({ user: session.user })) {
      whereClause.userId = userId;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: whereClause,
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

    return NextResponse.json({ leaveRequests });
  } catch (error) {
    console.error('List leave requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate, reason } = leaveRequestSchema.parse(body);

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { error: 'End date must be on or after start date' },
        { status: 400 }
      );
    }

    // Check for overlap with existing approved leaves
    const existingApprovedLeaves = await prisma.leaveRequest.findMany({
      where: {
        userId: session.user.id,
        status: 'APPROVED',
      },
    });

    for (const leave of existingApprovedLeaves) {
      const existingStart = new Date(leave.startDate);
      const existingEnd = new Date(leave.endDate);

      // Check for overlap
      if (start <= existingEnd && end >= existingStart) {
        return NextResponse.json(
          {
            error: 'Leave dates overlap with an existing approved leave request',
            overlap: {
              startDate: leave.startDate,
              endDate: leave.endDate,
            },
          },
          { status: 409 }
        );
      }
    }

    // Check for overlap with submitted reports (warn but allow)
    const overlappingReports = await prisma.report.findMany({
      where: {
        userId: session.user.id,
        status: 'SUBMITTED',
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    // Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: session.user.id,
        startDate: start,
        endDate: end,
        reason,
        status: 'PENDING',
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
    });

    return NextResponse.json({
      ...leaveRequest,
      warning: overlappingReports.length > 0
        ? `Leave overlaps with ${overlappingReports.length} submitted report(s). Please ensure reports are covered.`
        : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Create leave request error:', error);
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 });
  }
}
