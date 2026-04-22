import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env.server';

type PasswordResetPayload = {
  sub: string;
  email: string;
  exp: number;
};

type PasswordResetUser = {
  id: string;
  email: string;
  password: string;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signResetPayload(user: PasswordResetUser, payload: PasswordResetPayload) {
  return createHmac('sha256', env.AUTH_SECRET)
    .update(`${user.id}:${user.email}:${user.password}:${payload.exp}`)
    .digest('base64url');
}

export function createPasswordResetToken(
  user: PasswordResetUser,
  ttlMs: number = env.PASSWORD_RESET_TOKEN_TTL_MS
) {
  const payload: PasswordResetPayload = {
    sub: user.id,
    email: user.email,
    exp: Date.now() + ttlMs,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signResetPayload(user, payload);

  return `${encodedPayload}.${signature}`;
}

export function readPasswordResetToken(token: string) {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  try {
    const payload = JSON.parse(
      base64UrlDecode(encodedPayload)
    ) as PasswordResetPayload;

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }

    return { payload, encodedPayload, signature };
  } catch {
    return null;
  }
}

export function verifyPasswordResetToken(
  token: string,
  user: PasswordResetUser
) {
  const parsed = readPasswordResetToken(token);

  if (!parsed) {
    return { valid: false as const, reason: 'invalid-token' as const };
  }

  const { payload, signature } = parsed;

  if (payload.exp <= Date.now()) {
    return { valid: false as const, reason: 'expired' as const };
  }

  if (payload.sub !== user.id || payload.email !== user.email) {
    return { valid: false as const, reason: 'mismatch' as const };
  }

  const expectedSignature = signResetPayload(user, payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return { valid: false as const, reason: 'invalid-signature' as const };
  }

  return { valid: true as const, payload };
}

export function createPasswordResetUrl(token: string) {
  const url = new URL('/reset-password', env.NEXTAUTH_URL);
  url.searchParams.set('token', token);
  return url.toString();
}
