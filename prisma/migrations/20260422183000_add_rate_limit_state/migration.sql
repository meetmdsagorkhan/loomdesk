-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AccountLockoutState" (
    "subject" TEXT NOT NULL,
    "failureCount" INTEGER NOT NULL,
    "firstFailedAt" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountLockoutState_pkey" PRIMARY KEY ("subject")
);
