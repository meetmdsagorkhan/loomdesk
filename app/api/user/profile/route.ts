import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { passwordPolicySchema } from "@/lib/validations/auth";
import { auditEvent } from "@/lib/audit-log";
import { getRequestIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { issueEmailVerification } from '@/lib/email-verification';

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  currentPassword: z.string().min(1, "Current password is required").optional(),
  newPassword: passwordPolicySchema.optional(),
});

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorConfirmedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    logger.error("Failed to fetch user profile", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);
    const { currentPassword, newPassword, ...profileUpdates } = validatedData;
    const normalizedEmail =
      typeof profileUpdates.email === 'string'
        ? profileUpdates.email.trim().toLowerCase()
        : undefined;
    const nextProfileUpdates = {
      ...profileUpdates,
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
    };

    // Check if email is being changed and if it's already taken
    if (normalizedEmail && normalizedEmail !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }
    }

    if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
      return NextResponse.json(
        { error: "Provide both current and new password to change your password" },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (currentPassword && newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password);

      if (!isValidPassword) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...nextProfileUpdates,
        ...(newPassword ? { password: await bcrypt.hash(newPassword, 10) } : {}),
        ...(normalizedEmail && normalizedEmail !== session.user.email
          ? { emailVerifiedAt: null }
          : {}),
        ...(newPassword
          ? {
              sessionVersion: {
                increment: 1,
              },
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorConfirmedAt: true,
        createdAt: true,
        sessionVersion: true,
      },
    });

    const emailVerification =
      normalizedEmail && normalizedEmail !== session.user.email
        ? await issueEmailVerification({
            userId: updatedUser.id,
            email: updatedUser.email,
            recipientName: updatedUser.name,
          })
        : null;

    auditEvent({
      action: "user.profile.update",
      status: "success",
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role ?? undefined,
      targetType: "user",
      targetId: updatedUser.id,
      targetEmail: updatedUser.email,
      ipAddress,
      metadata: {
        updatedFields: Object.keys(nextProfileUpdates).concat(newPassword ? ["password"] : []),
        sessionsRevoked: Boolean(newPassword),
        emailVerificationDelivery: emailVerification?.emailResult.mode,
      },
    });

    return NextResponse.json({
      user: updatedUser,
      ...(emailVerification
        ? {
            emailVerificationRequired: true,
            deliveryMode: emailVerification.emailResult.mode,
            ...(emailVerification.emailResult.mode === 'preview'
              ? { previewUrl: emailVerification.verificationUrl }
              : {}),
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Failed to update user profile", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 });
  }
}
