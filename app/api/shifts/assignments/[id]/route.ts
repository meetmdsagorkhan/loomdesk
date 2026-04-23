import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-utils';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const updateAssignShiftSchema = z.object({
  userId: z.string(),
  shiftId: z.string(),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: assignmentId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete assignments
    if (!isAdmin({ user: session.user })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify assignment exists
    const assignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Delete assignment
    await prisma.shiftAssignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete assignment error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: assignmentId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin({ user: session.user })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, shiftId, startDate, endDate } = updateAssignShiftSchema.parse(body);

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (end && end < start) {
      return NextResponse.json(
        { error: 'End date must be on or after start date' },
        { status: 400 }
      );
    }

    // Verify assignment exists
    const assignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check for overlapping shift assignments (EXCLUDING current assignment)
    const existingAssignments = await prisma.shiftAssignment.findMany({
      where: {
        userId,
        id: { not: assignmentId },
        ...(end ? { startDate: { lte: end } } : {}),
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

    // Update shift assignment
    const updatedAssignment = await prisma.shiftAssignment.update({
      where: { id: assignmentId },
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

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    logger.error('Update assignment error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}
