import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-utils';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getRequestIp, consumeRateLimitPersistent } from '@/lib/rate-limit';
import { createNotification } from '@/lib/notifications';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

const assignShiftSchema = z.object({
  userId: z.string(),
  shiftId: z.string(),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can assign shifts
    if (!isAdmin({ user: session.user })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Apply rate limiting
    const rateLimit = await consumeRateLimitPersistent(`shifts:assign:${session.user.id}`, {
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
    const { userId, shiftId, startDate, endDate } = assignShiftSchema.parse(body);

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (end && end < start) {
      return NextResponse.json(
        { error: 'End date must be on or after start date' },
        { status: 400 }
      );
    }

    // Check for overlapping shift assignments
    const existingAssignments = await prisma.shiftAssignment.findMany({
      where: {
        userId,
        // Start date of existing must be before or equal to new end date (if new has an end date)
        ...(end ? { startDate: { lte: end } } : {}),
        // End date of existing must be after or equal to new start date, OR existing has no end date
        OR: [
          { endDate: null },
          { endDate: { gte: start } },
        ],
      },
    });

    if (existingAssignments.length > 0) {
      return NextResponse.json(
        { error: 'Shift assignment overlaps with existing assignment for this user' },
        { status: 409 }
      );
    }

    // Check for approved leave during this period
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: 'APPROVED',
        ...(end ? { startDate: { lte: end } } : {}),
        endDate: { gte: start },
      },
    });

    if (approvedLeaves.length > 0) {
      return NextResponse.json(
        { error: 'User has approved leave during this period' },
        { status: 409 }
      );
    }

    // Verify shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Create shift assignment
    const assignment = await prisma.shiftAssignment.create({
      data: {
        userId,
        shiftId,
        startDate: start,
        endDate: end,
      },
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
    });

    // Send notification to member
    try {
      const startDate = format(start, 'MMM d, yyyy');
      const endDateText = end ? ` to ${format(end, 'MMM d, yyyy')}` : '';
      await createNotification({
        userId,
        type: 'SHIFT_ASSIGNMENT',
        title: 'New Shift Assigned',
        message: `You have been assigned to ${shift.name} shift from ${startDate}${endDateText}.`,
      });
    } catch (error) {
      logger.error('Failed to send shift assignment notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't fail the request if notification fails
    }

    return NextResponse.json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    logger.error('Assign shift error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to assign shift' }, { status: 500 });
  }
}
