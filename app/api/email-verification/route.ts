import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { auditEvent } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/rate-limit';
import { issueEmailVerification } from '@/lib/email-verification';

export const dynamic = 'force-dynamic';

const verificationRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
});

export async function GET(request: NextRequest) {
  const ipAddress = getRequestIp(request);
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
  }

  try {
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            emailVerifiedAt: true,
          },
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
    }

    if (verificationToken.expiresAt <= new Date()) {
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });

      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
    }

    if (
      !verificationToken.user.isActive ||
      verificationToken.user.email !== verificationToken.email
    ) {
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });

      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerifiedAt: new Date(),
        },
      }),
      prisma.emailVerificationToken.deleteMany({
        where: { userId: verificationToken.userId },
      }),
    ]);

    auditEvent({
      action: 'auth.email-verification.confirm',
      status: 'success',
      actorId: verificationToken.user.id,
      actorEmail: verificationToken.user.email,
      actorRole: verificationToken.user.role,
      targetType: 'user',
      targetId: verificationToken.user.id,
      targetEmail: verificationToken.user.email,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: 'Your email address has been verified. You can now sign in.',
    });
  } catch (error) {
    auditEvent({
      action: 'auth.email-verification.confirm',
      status: 'failure',
      ipAddress,
      metadata: {
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
    });

    logger.error('Email verification confirm error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Failed to verify email address' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const payload = verificationRequestSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (user?.isActive && !user.emailVerifiedAt) {
      const verification = await issueEmailVerification({
        userId: user.id,
        email: user.email,
        recipientName: user.name,
      });

      auditEvent({
        action: 'auth.email-verification.request',
        status: 'success',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'user',
        targetId: user.id,
        targetEmail: user.email,
        ipAddress,
        metadata: {
          emailDelivery: verification.emailResult.mode,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          'If that email belongs to an unverified account, a verification link has been sent.',
        deliveryMode: verification.emailResult.mode,
        ...(verification.emailResult.mode === 'preview'
          ? { previewUrl: verification.verificationUrl }
          : {}),
      });
    }

    auditEvent({
      action: 'auth.email-verification.request',
      status: 'failure',
      targetEmail: payload.email,
      ipAddress,
      metadata: {
        reason: user?.emailVerifiedAt ? 'already-verified' : 'user-not-found-or-inactive',
      },
    });

    return NextResponse.json({
      success: true,
      message:
        'If that email belongs to an unverified account, a verification link has been sent.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    auditEvent({
      action: 'auth.email-verification.request',
      status: 'failure',
      ipAddress,
      metadata: {
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
    });

    logger.error('Email verification request error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to process email verification request' },
      { status: 500 }
    );
  }
}
