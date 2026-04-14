import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { z } from 'zod';

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'TEAM_LEAD', 'MEMBER']),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create invites
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role } = createInviteSchema.parse(body);

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findUnique({
      where: { email },
    });

    if (existingInvitation && existingInvitation.status === 'PENDING') {
      return NextResponse.json({ error: 'Invitation already pending for this email' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
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
        email,
        role,
        token,
        invitedById: session.user.id,
        expiresAt,
      },
    });

    // In production, send an email with the invitation link
    // For development, the token is returned in the response

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Create invite error:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}
