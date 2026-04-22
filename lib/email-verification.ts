import { randomBytes } from 'node:crypto';
import { env } from '@/lib/env.server';
import { buildEmailVerificationEmail } from '@/lib/email-templates';
import { sendTransactionalEmail } from '@/lib/email';

type EmailVerificationIdentity = {
  userId: string;
  email: string;
  recipientName?: string | null;
};

export function createEmailVerificationTokenValue() {
  return randomBytes(32).toString('base64url');
}

export function createEmailVerificationExpiryDate(
  ttlMs: number = env.EMAIL_VERIFICATION_TOKEN_TTL_MS
) {
  return new Date(Date.now() + ttlMs);
}

export function createEmailVerificationUrl(token: string) {
  const url = new URL('/verify-email', env.NEXTAUTH_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function issueEmailVerification(identity: EmailVerificationIdentity) {
  const { prisma } = await import('@/lib/db');

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId: identity.userId,
    },
  });

  const token = createEmailVerificationTokenValue();
  const expiresAt = createEmailVerificationExpiryDate();

  await prisma.emailVerificationToken.create({
    data: {
      userId: identity.userId,
      email: identity.email,
      token,
      expiresAt,
    },
  });

  const verificationUrl = createEmailVerificationUrl(token);
  const emailResult = await sendTransactionalEmail({
    to: identity.email,
    ...buildEmailVerificationEmail({
      verificationUrl,
      recipientEmail: identity.email,
      recipientName: identity.recipientName,
    }),
  });

  return {
    token,
    expiresAt,
    verificationUrl,
    emailResult,
  };
}
