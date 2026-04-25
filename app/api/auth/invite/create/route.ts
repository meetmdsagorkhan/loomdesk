import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { auditEvent } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/rate-limit';
import { env } from '@/lib/env.server';
import { buildInviteEmail } from '@/lib/email-templates';
import { sendTransactionalEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'TEAM_LEAD', 'MEMBER']),
});

export async function POST(request: NextRequest) {
  let actor:
    | {
        id: string;
        email?: string | null;
        role?: string | null;
      }
    | undefined;
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();
    actor = session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
        }
      : undefined;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create invites
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role } = createInviteSchema.parse(body);
    const normalizedEmail = email.trim().toLowerCase();

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingInvitation && existingInvitation.status === 'PENDING') {
      return NextResponse.json({ error: 'Invitation already pending for this email' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Create invitation with 7-day expiry
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        email: normalizedEmail,
        role,
        token,
        invitedById: session.user.id,
        expiresAt,
      },
    });

    const inviteUrl = new URL('/invite', env.NEXTAUTH_URL);
    inviteUrl.searchParams.set('token', token);

    const emailResult = await sendTransactionalEmail({
      to: normalizedEmail,
      ...buildInviteEmail({
        inviteUrl: inviteUrl.toString(),
        recipientEmail: normalizedEmail,
        role,
        inviterName: session.user.name ?? session.user.email ?? undefined,
      }),
    });

    auditEvent({
      action: 'auth.invite.create',
      status: 'success',
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role ?? undefined,
      targetType: 'invitation',
      targetId: invitation.id,
      targetEmail: normalizedEmail,
      ipAddress,
      metadata: {
        role,
        emailDelivery: emailResult.mode,
      },
    });

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      deliveryMode: emailResult.mode,
      ...(emailResult.mode === 'preview' ? { previewUrl: inviteUrl.toString() } : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    auditEvent({
      action: 'auth.invite.create',
      status: 'failure',
      actorId: actor?.id,
      actorEmail: actor?.email ?? undefined,
      actorRole: actor?.role ?? undefined,
      ipAddress,
      metadata: {
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
    });
    logger.error('Create invite error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}
