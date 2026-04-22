import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { auditEvent } from '@/lib/audit-log';
import {
  createPasswordResetToken,
  createPasswordResetUrl,
  readPasswordResetToken,
  verifyPasswordResetToken,
} from '@/lib/password-reset';
import { passwordPolicySchema } from '@/lib/validations/auth';
import { getRequestIp } from '@/lib/rate-limit';
import { sendTransactionalEmail } from '@/lib/email';
import { buildPasswordResetEmail } from '@/lib/email-templates';

const resetPasswordRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
});

const resetPasswordConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordPolicySchema,
});

const passwordResetSchema = z.union([
  resetPasswordRequestSchema,
  resetPasswordConfirmSchema,
]);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token is required' }, { status: 400 });
  }

  const parsed = readPasswordResetToken(token);

  if (!parsed) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired reset link' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.payload.sub },
    select: { id: true, email: true, password: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired reset link' }, { status: 400 });
  }

  const verification = verifyPasswordResetToken(token, user);

  if (!verification.valid) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired reset link' }, { status: 400 });
  }

  return NextResponse.json({ valid: true, email: user.email });
}

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const payload = passwordResetSchema.parse(await request.json());

    if ('email' in payload) {
      const user = await prisma.user.findUnique({
        where: { email: payload.email },
        select: {
          id: true,
          email: true,
          password: true,
          isActive: true,
        },
      });

      if (user?.isActive) {
        const token = createPasswordResetToken(user);
        const resetUrl = createPasswordResetUrl(token);
        const emailResult = await sendTransactionalEmail({
          to: user.email,
          ...buildPasswordResetEmail({
            resetUrl,
            recipientEmail: user.email,
          }),
        });

        auditEvent({
          action: 'auth.password-reset.request',
          status: 'success',
          actorId: user.id,
          actorEmail: user.email,
          targetType: 'user',
          targetId: user.id,
          targetEmail: user.email,
          ipAddress,
          metadata: {
            emailDelivery: emailResult.mode,
          },
        });

        return NextResponse.json({
          success: true,
          message:
            'If that email exists in our system, a password reset link has been generated.',
          deliveryMode: emailResult.mode,
          ...(emailResult.mode === 'preview' ? { previewUrl: resetUrl } : {}),
        });
      }

      auditEvent({
        action: 'auth.password-reset.request',
        status: 'failure',
        targetEmail: payload.email,
        ipAddress,
        metadata: {
          reason: 'user-not-found-or-inactive',
        },
      });

      return NextResponse.json({
        success: true,
        message:
          'If that email exists in our system, a password reset link has been generated.',
      });
    }

    const parsedToken = readPasswordResetToken(payload.token);

    if (!parsedToken) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: parsedToken.payload.sub },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const verification = verifyPasswordResetToken(payload.token, user);

    if (!verification.valid) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const passwordMatchesCurrent = await bcrypt.compare(payload.password, user.password);

    if (passwordMatchesCurrent) {
      return NextResponse.json(
        { error: 'Choose a password that is different from your current password' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(payload.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        sessionVersion: {
          increment: 1,
        },
      } satisfies Prisma.UserUpdateInput,
    });

    auditEvent({
      action: 'auth.password-reset.confirm',
      status: 'success',
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'user',
      targetId: user.id,
      targetEmail: user.email,
      ipAddress,
      metadata: {
        sessionsRevoked: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    auditEvent({
      action: 'auth.password-reset',
      status: 'failure',
      ipAddress,
      metadata: {
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
    });

    logger.error('Password reset error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
