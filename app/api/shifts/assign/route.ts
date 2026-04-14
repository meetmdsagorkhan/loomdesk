import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-utils';
import { z } from 'zod';

const assignShiftSchema = z.object({
  userId: z.string(),
  shiftId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can assign shifts
    if (!isAdmin({ user: session.user })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, shiftId, startDate, endDate } = assignShiftSchema.parse(body);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json(
        { error: 'End date must be on or after start date' },
        { status: 400 }
      );
    }

    // Check for overlapping shift assignments
    const existingAssignments = await prisma.shiftAssignment.findMany({
      where: {
        userId,
        endDate: { gte: start },
        startDate: { lte: end },
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
        endDate: { gte: start },
        startDate: { lte: end },
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

    return NextResponse.json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Assign shift error:', error);
    return NextResponse.json({ error: 'Failed to assign shift' }, { status: 500 });
  }
}
