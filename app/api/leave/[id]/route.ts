import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-utils';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

const approveRejectSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: leaveId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can approve/reject
    if (!isAdmin({ user: session.user })) {
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
      if (supabase) {
        const startDate = format(new Date(updatedRequest.startDate), 'MMM d');
        const endDate = format(new Date(updatedRequest.endDate), 'MMM d, yyyy');
        const dateRange = startDate === endDate ? endDate : `${startDate} - ${endDate}`;
        
        await supabase.from('notifications').insert({
          user_id: updatedRequest.userId,
          type: 'LEAVE_UPDATE',
          title: `Leave ${status}`,
          message: `Your leave request for ${dateRange} was ${status.toLowerCase()}`,
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Update leave request error:', error);
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
  }
}
