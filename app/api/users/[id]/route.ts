import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma as db } from '@/lib/db';
import { isAdmin } from '@/lib/auth-utils';
import { auditEvent } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const updateUserSchema = z.object({
  action: z.enum(['pause', 'resume']),
});

export async function PATCH(
  request: NextRequest,
  context: RouteContext<'/api/users/[id]'>
) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const payload = updateUserSchema.parse(await request.json());

    if (session.user.id === id) {
      return NextResponse.json({ error: 'You cannot pause or resume your own account' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (targetUser.role === 'ADMIN') {
      logger.warn('Attempted to modify admin account', {
        actorId: session.user.id,
        actorEmail: session.user.email,
        targetId: targetUser.id,
        targetEmail: targetUser.email,
        action: payload.action,
      });
      return NextResponse.json({ error: 'Admin accounts cannot be modified here' }, { status: 400 });
    }

    const shouldBeActive = payload.action === 'resume';

    await db.user.update({
      where: { id },
      data: {
        isActive: shouldBeActive,
        sessionVersion: shouldBeActive ? undefined : { increment: 1 },
      },
    });

    auditEvent({
      action: payload.action === 'pause' ? 'admin.user.pause' : 'admin.user.resume',
      status: 'success',
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role ?? undefined,
      targetType: 'user',
      targetId: targetUser.id,
      targetEmail: targetUser.email,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: payload.action === 'pause' ? 'Member paused successfully' : 'Member resumed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }

    logger.error('Failed to update user status', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Failed to update member status' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<'/api/users/[id]'>
) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;

    if (session.user.id === id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (targetUser.role === 'ADMIN') {
      return NextResponse.json({ error: 'Admin accounts cannot be deleted here' }, { status: 400 });
    }

    const reportEntries = await db.reportEntry.findMany({
      where: {
        report: {
          userId: targetUser.id,
        },
      },
      select: {
        id: true,
      },
    });

    const reportEntryIds = reportEntries.map((entry) => entry.id);

    await db.$transaction([
      db.feedback.deleteMany({
        where: {
          entryId: {
            in: reportEntryIds,
          },
        },
      }),
      db.reportEntry.deleteMany({
        where: {
          report: {
            userId: targetUser.id,
          },
        },
      }),
      db.scoreEvent.deleteMany({
        where: {
          userId: targetUser.id,
        },
      }),
      db.report.deleteMany({
        where: {
          userId: targetUser.id,
        },
      }),
      db.leaveRequest.deleteMany({
        where: {
          userId: targetUser.id,
        },
      }),
      db.shiftException.deleteMany({
        where: {
          userId: targetUser.id,
        },
      }),
      db.shiftAssignment.deleteMany({
        where: {
          userId: targetUser.id,
        },
      }),
      db.notification.deleteMany({
        where: {
          userId: targetUser.id,
        },
      }),
      db.message.deleteMany({
        where: {
          OR: [
            { senderId: targetUser.id },
            { receiverId: targetUser.id },
          ],
        },
      }),
      db.emailVerificationToken.deleteMany({
        where: {
          userId: targetUser.id,
        },
      }),
      db.invitation.deleteMany({
        where: {
          OR: [
            { invitedById: targetUser.id },
            { email: targetUser.email },
          ],
        },
      }),
      db.user.delete({
        where: {
          id: targetUser.id,
        },
      }),
    ]);

    auditEvent({
      action: 'admin.user.delete',
      status: 'success',
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role ?? undefined,
      targetType: 'user',
      targetId: targetUser.id,
      targetEmail: targetUser.email,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: 'Member deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete user', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
}
