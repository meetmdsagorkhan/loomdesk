import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { passwordPolicySchema } from '@/lib/validations/auth';
import { auditEvent } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/rate-limit';
import { issueEmailVerification } from '@/lib/email-verification';

export const dynamic = 'force-dynamic';

const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  name: z.string().min(2),
  password: passwordPolicySchema,
});

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const body = await request.json();
    const { token, name, password } = acceptInviteSchema.parse(body);

    // Validate token
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { invitedBy: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 });
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invitation already used' }, { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: invitation.email,
        name,
        emailVerifiedAt: null,
        password: hashedPassword,
        role: invitation.role,
        isActive: true,
        invitedBy: invitation.invitedById,
      },
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    const verification = await issueEmailVerification({
      userId: user.id,
      email: user.email,
      recipientName: user.name,
    });

    auditEvent({
      action: 'auth.invite.accept',
      status: 'success',
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'invitation',
      targetId: invitation.id,
      ipAddress,
      metadata: {
        invitedById: invitation.invitedById,
        emailDelivery: verification.emailResult.mode,
      },
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      deliveryMode: verification.emailResult.mode,
      ...(verification.emailResult.mode === 'preview'
        ? { previewUrl: verification.verificationUrl }
        : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    auditEvent({
      action: 'auth.invite.accept',
      status: 'failure',
      ipAddress,
      metadata: {
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
    });
    logger.error('Accept invite error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
