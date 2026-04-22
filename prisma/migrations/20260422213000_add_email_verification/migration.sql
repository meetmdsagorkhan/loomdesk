ALTER TABLE "User"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

UPDATE "User"
SET "emailVerifiedAt" = NOW()
WHERE "emailVerifiedAt" IS NULL;

CREATE TABLE "EmailVerificationToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");
CREATE INDEX "EmailVerificationToken_userId_createdAt_idx" ON "EmailVerificationToken"("userId", "createdAt");
CREATE INDEX "EmailVerificationToken_email_createdAt_idx" ON "EmailVerificationToken"("email", "createdAt");

ALTER TABLE "EmailVerificationToken"
ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
