import { env } from '@/lib/env.server';

export function getSessionLifetimeMs(rememberMe: boolean) {
  return rememberMe ? env.SESSION_REMEMBER_ME_MAX_AGE_MS : env.SESSION_MAX_AGE_MS;
}

export function normalizeRememberMe(value: unknown) {
  return value === true || value === 'true' || value === 'on';
}

export function createSessionExpiryTimestamp(
  rememberMe: boolean,
  now: number = Date.now()
) {
  return now + getSessionLifetimeMs(rememberMe);
}

export function isSessionExpired(
  sessionExpiresAt: unknown,
  now: number = Date.now()
) {
  return typeof sessionExpiresAt !== 'number' || sessionExpiresAt <= now;
}
