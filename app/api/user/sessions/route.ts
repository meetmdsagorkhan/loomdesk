import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { auditEvent } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    expires: session.expires,
    rememberMe: session.user.rememberMe ?? false,
    sessionVersion: session.user.sessionVersion ?? 0,
  });
}

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        sessionVersion: {
          increment: 1,
        },
      } satisfies Prisma.UserUpdateInput,
      select: {
        id: true,
        email: true,
        sessionVersion: true,
      },
    });

    auditEvent({
      action: 'auth.session.revoke-all',
      status: 'success',
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role ?? undefined,
      targetType: 'user',
      targetId: updatedUser.id,
      targetEmail: updatedUser.email,
      ipAddress,
      metadata: {
        sessionVersion: updatedUser.sessionVersion,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'All active sessions have been revoked. Please sign in again on each device.',
    });
  } catch (error) {
    auditEvent({
      action: 'auth.session.revoke-all',
      status: 'failure',
      ipAddress,
      metadata: {
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
    });

    logger.error('Failed to revoke user sessions', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to revoke active sessions' },
      { status: 500 }
    );
  }
}
