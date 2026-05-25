import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAuthorized } from '@/lib/auth-utils';
import { z } from 'zod';
import { format } from 'date-fns';
import { createNotification } from '@/lib/notifications';
import { auditEvent } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const approveRejectSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();
    const { id: leaveId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Requires manage_leaves permission
    if (!isAuthorized(session, 'manage_leaves')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const { status } = approveRejectSchema.parse(body);

    // Verify leave request exists and is pending
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Leave request has already been reviewed' },
        { status: 400 }
      );
    }

    // Update leave request
    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
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

    // Send notification to member
    try {
      const startDate = format(new Date(updatedRequest.startDate), 'MMM d');
      const endDate = format(new Date(updatedRequest.endDate), 'MMM d, yyyy');
      const dateRange = startDate === endDate ? endDate : `${startDate} - ${endDate}`;

      await createNotification({
        userId: updatedRequest.userId,
        type: 'LEAVE_UPDATE',
        title: `Leave ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        message: `Your leave request for ${dateRange} was ${status.toLowerCase()}.`,
      });
    } catch (error) {
      logger.error('Failed to send leave notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't fail the request if notification fails
    }

    auditEvent({
      action: 'leave.review',
      status: 'success',
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role ?? undefined,
      targetType: 'leave-request',
      targetId: updatedRequest.id,
      targetEmail: updatedRequest.user.email,
      ipAddress,
      metadata: {
        status,
        reviewedUserId: updatedRequest.userId,
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    logger.error('Update leave request error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
  }
}
