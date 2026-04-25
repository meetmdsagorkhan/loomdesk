import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-utils';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getRequestIp } from '@/lib/rate-limit';

const updateSubmissionSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  adminNote: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can update submissions
    if (!isAdmin({ user: session.user })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, priority, adminNote } = updateSubmissionSchema.parse(body);

    const { id } = await params;

    const submission = await prisma.userSubmission.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(adminNote !== undefined && { adminNote }),
      },
    });

    logger.info('Submission updated', {
      submissionId: submission.id,
      updatedBy: session.user.id,
      updates: { status, priority, hasAdminNote: !!adminNote },
      ipAddress,
    });

    return NextResponse.json(submission);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    logger.error('Update submission error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress,
    });
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
  }
}
