import { logger } from '@/lib/logger';

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  blockDurationMs?: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
  blockedUntil: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
};

declare global {
  var __loomdeskRateLimitStore: Map<string, RateLimitState> | undefined;
}

const rateLimitStore =
  globalThis.__loomdeskRateLimitStore ?? new Map<string, RateLimitState>();

if (!globalThis.__loomdeskRateLimitStore) {
  globalThis.__loomdeskRateLimitStore = rateLimitStore;
}

let persistentRateLimitAvailable = true;
let hasWarnedRateLimitFallback = false;

function now() {
  return Date.now();
}

function cleanupExpiredEntries(currentTime: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.blockedUntil <= currentTime && value.resetAt <= currentTime) {
      rateLimitStore.delete(key);
    }
  }
}

export function consumeRateLimit(
  key: string,
  { limit, windowMs, blockDurationMs = windowMs }: RateLimitOptions
): RateLimitResult {
  const currentTime = now();
  cleanupExpiredEntries(currentTime);

  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= currentTime) {
    const nextState: RateLimitState = {
      count: 1,
      resetAt: currentTime + windowMs,
      blockedUntil: 0,
    };

    rateLimitStore.set(key, nextState);

    return {
      success: true,
      limit,
      remaining: Math.max(limit - 1, 0),
      resetAt: nextState.resetAt,
      retryAfterMs: 0,
    };
  }

  if (existing.blockedUntil > currentTime) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterMs: existing.blockedUntil - currentTime,
    };
  }

  existing.count += 1;

  if (existing.count > limit) {
    existing.blockedUntil = currentTime + blockDurationMs;

    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterMs: existing.blockedUntil - currentTime,
    };
  }

  return {
    success: true,
    limit,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: existing.resetAt,
    retryAfterMs: 0,
  };
}

export function getRateLimitStatus(
  key: string,
  { limit, windowMs }: Pick<RateLimitOptions, 'limit' | 'windowMs'>
): RateLimitResult {
  const currentTime = now();
  cleanupExpiredEntries(currentTime);

  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= currentTime) {
    return {
      success: true,
      limit,
      remaining: limit,
      resetAt: currentTime + windowMs,
      retryAfterMs: 0,
    };
  }

  if (existing.blockedUntil > currentTime) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterMs: existing.blockedUntil - currentTime,
    };
  }

  return {
    success: true,
    limit,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: existing.resetAt,
    retryAfterMs: 0,
  };
}

type PersistedRateLimitRow = {
  key: string;
  count: number;
  windowStart: Date;
  blockedUntil: Date | null;
};

function warnRateLimitFallback(reason: string) {
  if (hasWarnedRateLimitFallback) {
    return;
  }

  hasWarnedRateLimitFallback = true;
  logger.warn(`Persistent rate limiting unavailable. Falling back to memory store. ${reason}`);
}

async function readPersistedRateLimit(key: string) {
  if (!persistentRateLimitAvailable) {
    return { available: false as const, row: null };
  }

  try {
    const { prisma } = await import('@/lib/db');
    const rows = await prisma.$queryRawUnsafe<PersistedRateLimitRow[]>(
      `
        SELECT "key", "count", "windowStart", "blockedUntil"
        FROM "RateLimitBucket"
        WHERE "key" = $1
        LIMIT 1
      `,
      key
    );

    return { available: true as const, row: rows[0] ?? null };
  } catch (error) {
    persistentRateLimitAvailable = false;
    warnRateLimitFallback(error instanceof Error ? error.message : 'Unknown database error');
    return { available: false as const, row: null };
  }
}

async function writePersistedRateLimit(
  key: string,
  count: number,
  windowStart: Date,
  blockedUntil: Date | null
) {
  if (!persistentRateLimitAvailable) {
    return false;
  }

  try {
    const { prisma } = await import('@/lib/db');
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "RateLimitBucket" (
          "key",
          "count",
          "windowStart",
          "blockedUntil",
          "updatedAt"
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("key") DO UPDATE SET
          "count" = EXCLUDED."count",
          "windowStart" = EXCLUDED."windowStart",
          "blockedUntil" = EXCLUDED."blockedUntil",
          "updatedAt" = CURRENT_TIMESTAMP
      `,
      key,
      count,
      windowStart,
      blockedUntil
    );

    return true;
  } catch (error) {
    persistentRateLimitAvailable = false;
    warnRateLimitFallback(error instanceof Error ? error.message : 'Unknown database error');
    return false;
  }
}

export async function consumeRateLimitPersistent(
  key: string,
  options: RateLimitOptions
) {
  const { available, row: existing } = await readPersistedRateLimit(key);

  if (!available) {
    return consumeRateLimit(key, options);
  }

  if (!existing) {
    const currentTime = now();
    const nextWindowStart = new Date(currentTime);
    await writePersistedRateLimit(key, 1, nextWindowStart, null);

    return {
      success: true,
      limit: options.limit,
      remaining: Math.max(options.limit - 1, 0),
      resetAt: currentTime + options.windowMs,
      retryAfterMs: 0,
    };
  }

  const currentTime = now();
  const windowStartMs = existing.windowStart.getTime();
  const resetAt = windowStartMs + options.windowMs;
  const blockedUntilMs = existing.blockedUntil?.getTime() ?? 0;

  if (blockedUntilMs > currentTime) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetAt,
      retryAfterMs: blockedUntilMs - currentTime,
    };
  }

  if (resetAt <= currentTime) {
    const nextWindowStart = new Date(currentTime);
    const persisted = await writePersistedRateLimit(key, 1, nextWindowStart, null);

    if (persisted) {
      return {
        success: true,
        limit: options.limit,
        remaining: Math.max(options.limit - 1, 0),
        resetAt: currentTime + options.windowMs,
        retryAfterMs: 0,
      };
    }

    return consumeRateLimit(key, options);
  }

  const nextCount = existing.count + 1;
  const blockedUntil =
    nextCount > options.limit
      ? new Date(currentTime + (options.blockDurationMs ?? options.windowMs))
      : null;

  const persisted = await writePersistedRateLimit(
    key,
    nextCount,
    existing.windowStart,
    blockedUntil
  );

  if (!persisted) {
    return consumeRateLimit(key, options);
  }

  if (blockedUntil) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetAt,
      retryAfterMs: blockedUntil.getTime() - currentTime,
    };
  }

  return {
    success: true,
    limit: options.limit,
    remaining: Math.max(options.limit - nextCount, 0),
    resetAt,
    retryAfterMs: 0,
  };
}

export async function getRateLimitStatusPersistent(
  key: string,
  options: Pick<RateLimitOptions, 'limit' | 'windowMs'>
) {
  const { available, row: existing } = await readPersistedRateLimit(key);

  if (!available || !existing) {
    return getRateLimitStatus(key, options);
  }

  const currentTime = now();
  const resetAt = existing.windowStart.getTime() + options.windowMs;
  const blockedUntilMs = existing.blockedUntil?.getTime() ?? 0;

  if (resetAt <= currentTime) {
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit,
      resetAt: currentTime + options.windowMs,
      retryAfterMs: 0,
    };
  }

  if (blockedUntilMs > currentTime) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetAt,
      retryAfterMs: blockedUntilMs - currentTime,
    };
  }

  return {
    success: true,
    limit: options.limit,
    remaining: Math.max(options.limit - existing.count, 0),
    resetAt,
    retryAfterMs: 0,
  };
}

export function getRequestIp(request: Pick<Request, 'headers'>) {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  );
}

export function resetRateLimitStore() {
  rateLimitStore.clear();
}
