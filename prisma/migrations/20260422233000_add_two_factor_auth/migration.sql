ALTER TABLE "User"
ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "twoFactorSecret" TEXT,
ADD COLUMN "twoFactorRecoveryCodes" JSONB,
ADD COLUMN "twoFactorConfirmedAt" TIMESTAMP(3);
