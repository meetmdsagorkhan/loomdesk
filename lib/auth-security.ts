import { logger } from '@/lib/logger';

type LockoutOptions = {
  threshold: number;
  windowMs: number;
  baseLockMs: number;
  maxLockMs?: number;
};

type AccountLockState = {
  firstFailedAt: number;
  failureCount: number;
  lockedUntil: number;
};

type AccountLockStatus = {
  locked: boolean;
  failureCount: number;
  retryAfterMs: number;
};

declare global {
  var __loomdeskAccountLockStore: Map<string, AccountLockState> | undefined;
}

const accountLockStore =
  globalThis.__loomdeskAccountLockStore ?? new Map<string, AccountLockState>();

if (!globalThis.__loomdeskAccountLockStore) {
  globalThis.__loomdeskAccountLockStore = accountLockStore;
}

let persistentLockoutAvailable = true;
let hasWarnedLockoutFallback = false;

const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

function getLockKey(identifier: string) {
  return identifier.trim().toLowerCase();
}

function createFreshState(timestamp: number): AccountLockState {
  return {
    firstFailedAt: timestamp,
    failureCount: 0,
    lockedUntil: 0,
  };
}

function getOrCreateState(identifier: string, options: LockoutOptions) {
  const key = getLockKey(identifier);
  const currentTime = Date.now();
  const existing = accountLockStore.get(key);

  if (!existing || currentTime - existing.firstFailedAt > options.windowMs) {
    const freshState = createFreshState(currentTime);
    accountLockStore.set(key, freshState);
    return { key, currentTime, state: freshState };
  }

  return { key, currentTime, state: existing };
}

type PersistedAccountLockRow = {
  subject: string;
  failureCount: number;
  firstFailedAt: Date;
  lockedUntil: Date | null;
};

function warnLockoutFallback(reason: string) {
  if (hasWarnedLockoutFallback) {
    return;
  }

  hasWarnedLockoutFallback = true;
  logger.warn(`Persistent account lockout unavailable. Falling back to memory store. ${reason}`);
}

async function readPersistedLockState(identifier: string) {
  if (!persistentLockoutAvailable) {
    return { available: false as const, row: null };
  }

  try {
    const { prisma } = await import('@/lib/db');
    const rows = await prisma.$queryRawUnsafe<PersistedAccountLockRow[]>(
      `
        SELECT "subject", "failureCount", "firstFailedAt", "lockedUntil"
        FROM "AccountLockoutState"
        WHERE "subject" = $1
        LIMIT 1
      `,
      getLockKey(identifier)
    );

    return { available: true as const, row: rows[0] ?? null };
  } catch (error) {
    persistentLockoutAvailable = false;
    warnLockoutFallback(error instanceof Error ? error.message : 'Unknown database error');
    return { available: false as const, row: null };
  }
}

async function writePersistedLockState(
  identifier: string,
  failureCount: number,
  firstFailedAt: Date,
  lockedUntil: Date | null
) {
  if (!persistentLockoutAvailable) {
    return false;
  }

  try {
    const { prisma } = await import('@/lib/db');
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "AccountLockoutState" (
          "subject",
          "failureCount",
          "firstFailedAt",
          "lockedUntil",
          "updatedAt"
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("subject") DO UPDATE SET
          "failureCount" = EXCLUDED."failureCount",
          "firstFailedAt" = EXCLUDED."firstFailedAt",
          "lockedUntil" = EXCLUDED."lockedUntil",
          "updatedAt" = CURRENT_TIMESTAMP
      `,
      getLockKey(identifier),
      failureCount,
      firstFailedAt,
      lockedUntil
    );

    return true;
  } catch (error) {
    persistentLockoutAvailable = false;
    warnLockoutFallback(error instanceof Error ? error.message : 'Unknown database error');
    return false;
  }
}

async function deletePersistedLockState(identifier: string) {
  if (!persistentLockoutAvailable) {
    return false;
  }

  try {
    const { prisma } = await import('@/lib/db');
    await prisma.$executeRawUnsafe(
      `
        DELETE FROM "AccountLockoutState"
        WHERE "subject" = $1
      `,
      getLockKey(identifier)
    );

    return true;
  } catch (error) {
    persistentLockoutAvailable = false;
    warnLockoutFallback(error instanceof Error ? error.message : 'Unknown database error');
    return false;
  }
}

export function getAccountLockState(
  identifier: string,
  options: LockoutOptions
): AccountLockStatus {
  const { state, currentTime } = getOrCreateState(identifier, options);

  return {
    locked: state.lockedUntil > currentTime,
    failureCount: state.failureCount,
    retryAfterMs: Math.max(state.lockedUntil - currentTime, 0),
  };
}

export function recordFailedLogin(identifier: string, options: LockoutOptions) {
  const { key, state, currentTime } = getOrCreateState(identifier, options);

  state.failureCount += 1;

  if (state.failureCount >= options.threshold) {
    const multiplier = Math.max(state.failureCount - options.threshold, 0);
    const maxLockMs = options.maxLockMs ?? options.baseLockMs * 8;
    const lockMs = Math.min(options.baseLockMs * 2 ** multiplier, maxLockMs);

    state.lockedUntil = currentTime + lockMs;
  }

  accountLockStore.set(key, state);

  return getAccountLockState(identifier, options);
}

export function clearFailedLogins(identifier: string) {
  accountLockStore.delete(getLockKey(identifier));
}

export async function getAccountLockStatePersistent(
  identifier: string,
  options: LockoutOptions
) {
  const { available, row: existing } = await readPersistedLockState(identifier);

  if (!available || !existing) {
    return getAccountLockState(identifier, options);
  }

  const currentTime = Date.now();
  const firstFailedAt = existing.firstFailedAt.getTime();

  if (currentTime - firstFailedAt > options.windowMs) {
    await writePersistedLockState(identifier, 0, new Date(currentTime), null);

    return {
      locked: false,
      failureCount: 0,
      retryAfterMs: 0,
    };
  }

  const lockedUntilMs = existing.lockedUntil?.getTime() ?? 0;

  return {
    locked: lockedUntilMs > currentTime,
    failureCount: existing.failureCount,
    retryAfterMs: Math.max(lockedUntilMs - currentTime, 0),
  };
}

export async function recordFailedLoginPersistent(
  identifier: string,
  options: LockoutOptions
) {
  const { available, row: existing } = await readPersistedLockState(identifier);

  if (!available) {
    return recordFailedLogin(identifier, options);
  }

  if (!existing) {
    const currentTime = Date.now();
    const firstFailedAt = new Date(currentTime);
    const lockedUntil =
      options.threshold <= 1 ? new Date(currentTime + options.baseLockMs) : null;

    const persisted = await writePersistedLockState(
      identifier,
      1,
      firstFailedAt,
      lockedUntil
    );

    if (!persisted) {
      return recordFailedLogin(identifier, options);
    }

    return {
      locked: Boolean(lockedUntil),
      failureCount: 1,
      retryAfterMs: lockedUntil ? lockedUntil.getTime() - currentTime : 0,
    };
  }

  const currentTime = Date.now();
  const firstFailedAt = existing.firstFailedAt.getTime();
  const withinWindow = currentTime - firstFailedAt <= options.windowMs;
  const nextFailureCount = withinWindow ? existing.failureCount + 1 : 1;
  const nextFirstFailedAt = withinWindow ? existing.firstFailedAt : new Date(currentTime);

  let lockedUntil: Date | null = null;

  if (nextFailureCount >= options.threshold) {
    const multiplier = Math.max(nextFailureCount - options.threshold, 0);
    const maxLockMs = options.maxLockMs ?? options.baseLockMs * 8;
    const lockMs = Math.min(options.baseLockMs * 2 ** multiplier, maxLockMs);
    lockedUntil = new Date(currentTime + lockMs);
  }

  const persisted = await writePersistedLockState(
    identifier,
    nextFailureCount,
    nextFirstFailedAt,
    lockedUntil
  );

  if (!persisted) {
    return recordFailedLogin(identifier, options);
  }

  return {
    locked: Boolean(lockedUntil && lockedUntil.getTime() > currentTime),
    failureCount: nextFailureCount,
    retryAfterMs: lockedUntil ? Math.max(lockedUntil.getTime() - currentTime, 0) : 0,
  };
}

export async function clearFailedLoginsPersistent(identifier: string) {
  const deleted = await deletePersistedLockState(identifier);

  if (!deleted) {
    clearFailedLogins(identifier);
  }
}

export function hasSessionCookie(request: {
  cookies: { get(name: string): { value: string } | undefined };
}) {
  return SESSION_COOKIE_NAMES.some((cookieName) => Boolean(request.cookies.get(cookieName)));
}

export function resetAccountLockStore() {
  accountLockStore.clear();
}
