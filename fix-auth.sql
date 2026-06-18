-- Run this SQL query in your PostgreSQL database to fix the admin account
-- This will:
-- 1. Reset the admin user's isActive status to true
-- 2. Ensure emailVerifiedAt is set
-- 3. Clear any account lockout for this email
-- 4. Reset sessionVersion to 0 to invalidate any stale sessions

-- Step 1: Update the admin user
UPDATE "User"
SET "isActive" = true,
    "emailVerifiedAt" = COALESCE("emailVerifiedAt", NOW()),
    "sessionVersion" = 0
WHERE "email" = 'sagor.khan@priyo.net';

-- Step 2: Clear any account lockout
DELETE FROM "AccountLockoutState"
WHERE "subject" = 'sagor.khan@priyo.net';

-- Step 3: Verify the fix
SELECT 
    "id",
    "email",
    "name",
    "role",
    "isActive",
    "emailVerifiedAt",
    "sessionVersion",
    "twoFactorEnabled"
FROM "User"
WHERE "email" = 'sagor.khan@priyo.net';
