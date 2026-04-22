import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { auditEvent } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import {
  createTwoFactorOtpAuthUrl,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateRecoveryCodes,
  generateTwoFactorSecret,
  hashRecoveryCodes,
  parseStoredRecoveryCodes,
  verifyRecoveryCode,
  verifyTotpToken,
} from '@/lib/two-factor';

const twoFactorActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('setup'),
  }),
  z.object({
    action: z.literal('enable'),
    otp: z.string().trim().min(6, 'Authentication code is required'),
  }),
  z.object({
    action: z.literal('disable'),
    currentPassword: z.string().min(1, 'Current password is required'),
    otp: z.string().trim().optional(),
    recoveryCode: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal('regenerate-recovery-codes'),
    currentPassword: z.string().min(1, 'Current password is required'),
    otp: z.string().trim().optional(),
    recoveryCode: z.string().trim().optional(),
  }),
]);

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
      twoFactorEnabled: true,
      twoFactorConfirmedAt: true,
      twoFactorRecoveryCodes: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    enabled: user.twoFactorEnabled,
    emailVerified: Boolean(user.emailVerifiedAt),
    confirmedAt: user.twoFactorConfirmedAt,
    recoveryCodesRemaining: parseStoredRecoveryCodes(user.twoFactorRecoveryCodes).length,
  });
}

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = twoFactorActionSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorRecoveryCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: 'Verify your email address before enabling two-factor authentication' },
        { status: 400 }
      );
    }

    if (payload.action === 'setup') {
      const secret = generateTwoFactorSecret();
      const otpauthUrl = createTwoFactorOtpAuthUrl(user.email, secret);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: encryptTwoFactorSecret(secret),
          twoFactorRecoveryCodes: [],
          twoFactorConfirmedAt: null,
        } satisfies Prisma.UserUpdateInput,
      });

      auditEvent({
        action: 'auth.two-factor.setup',
        status: 'success',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'user',
        targetId: user.id,
        targetEmail: user.email,
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        secret,
        otpauthUrl,
      });
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'Start two-factor setup before attempting this action' },
        { status: 400 }
      );
    }

    const secret = decryptTwoFactorSecret(user.twoFactorSecret);

    if (payload.action === 'enable') {
      if (!verifyTotpToken(secret, payload.otp)) {
        return NextResponse.json({ error: 'Invalid authentication code' }, { status: 400 });
      }

      const recoveryCodes = generateRecoveryCodes();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorRecoveryCodes: hashRecoveryCodes(recoveryCodes),
          twoFactorConfirmedAt: new Date(),
        } satisfies Prisma.UserUpdateInput,
      });

      auditEvent({
        action: 'auth.two-factor.enable',
        status: 'success',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'user',
        targetId: user.id,
        targetEmail: user.email,
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        recoveryCodes,
      });
    }

    const passwordValid = await bcrypt.compare(payload.currentPassword, user.password);

    if (!passwordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const recoveryCodeResult = verifyRecoveryCode(
      'recoveryCode' in payload ? payload.recoveryCode : undefined,
      parseStoredRecoveryCodes(user.twoFactorRecoveryCodes)
    );
    const otpValid = 'otp' in payload ? verifyTotpToken(secret, payload.otp ?? '') : false;

    if (!otpValid && !recoveryCodeResult.valid) {
      return NextResponse.json(
        { error: 'A valid authentication code or recovery code is required' },
        { status: 400 }
      );
    }

    if (payload.action === 'disable') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorRecoveryCodes: [],
          twoFactorConfirmedAt: null,
          sessionVersion: {
            increment: 1,
          },
        } satisfies Prisma.UserUpdateInput,
      });

      auditEvent({
        action: 'auth.two-factor.disable',
        status: 'success',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'user',
        targetId: user.id,
        targetEmail: user.email,
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        message: 'Two-factor authentication has been disabled.',
      });
    }

    const recoveryCodes = generateRecoveryCodes();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorRecoveryCodes: hashRecoveryCodes(recoveryCodes),
      } satisfies Prisma.UserUpdateInput,
    });

    auditEvent({
      action: 'auth.two-factor.regenerate-recovery-codes',
      status: 'success',
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'user',
      targetId: user.id,
      targetEmail: user.email,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      recoveryCodes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    auditEvent({
      action: 'auth.two-factor',
      status: 'failure',
      ipAddress,
      metadata: {
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
    });

    logger.error('Two-factor management error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to process two-factor authentication request' },
      { status: 500 }
    );
  }
}
