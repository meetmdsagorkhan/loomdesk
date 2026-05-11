import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import * as bcrypt from "bcryptjs"
import { env } from "@/lib/env.server"
import { logger } from "@/lib/logger"
import { loginSchema } from "@/lib/validations/auth"
import {
  consumeRateLimitPersistent,
  getRateLimitStatusPersistent,
  getRequestIp,
} from "@/lib/rate-limit"
import {
  clearFailedLoginsPersistent,
  getAccountLockStatePersistent,
  recordFailedLoginPersistent,
} from "@/lib/auth-security"
import { auditEvent } from "@/lib/audit-log"
import {
  createSessionExpiryTimestamp,
  isSessionExpired,
  normalizeRememberMe,
} from "@/lib/session-security"
import {
  decryptTwoFactorSecret,
  parseStoredRecoveryCodes,
  verifyRecoveryCode,
  verifyTotpToken,
} from "@/lib/two-factor"

// In-memory cache to prevent thundering herd DB queries on parallel SWR fetches
const globalSessionCache = new Map<string, { timestamp: number; user: any }>()

// Ensure NEXTAUTH_URL has a protocol before NextAuth initializes
if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith("http")) {
  process.env.NEXTAUTH_URL = `https://${process.env.NEXTAUTH_URL}`
}
if (process.env.AUTH_URL && !process.env.AUTH_URL.startsWith("http")) {
  process.env.AUTH_URL = `https://${process.env.AUTH_URL}`
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "Authentication Code", type: "text" },
        recoveryCode: { label: "Recovery Code", type: "text" },
        rememberMe: { label: "Remember Me", type: "checkbox" },
      },
      authorize: async (credentials, request) => {
        const ipAddress = getRequestIp(request)
        const ipRateLimitKey = `auth:${ipAddress}`
        const ipRateLimit = await getRateLimitStatusPersistent(ipRateLimitKey, {
          limit: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
          windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
        })

        if (!ipRateLimit.success) {
          logger.warn("Blocked login attempt due to IP rate limiting", {
            ipAddress,
          })
          auditEvent({
            action: "auth.login",
            status: "failure",
            ipAddress,
            metadata: { reason: "ip-rate-limit" },
          })
          return null
        }

        const parsedCredentials = loginSchema.safeParse(credentials)

        if (!parsedCredentials.success) {
          await consumeRateLimitPersistent(ipRateLimitKey, {
            limit: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
            windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
            blockDurationMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
          })
          logger.warn("Rejected login due to invalid credential format", {
            ipAddress,
          })
          auditEvent({
            action: "auth.login",
            status: "failure",
            ipAddress,
            metadata: { reason: "invalid-format" },
          })
          return null
        }

        const email = parsedCredentials.data.email.trim().toLowerCase()
        const { password, otp, recoveryCode } = parsedCredentials.data
        const rememberMe = normalizeRememberMe(parsedCredentials.data.rememberMe)
        const lockoutState = await getAccountLockStatePersistent(email, {
          threshold: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
          windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
          baseLockMs: env.AUTH_LOCKOUT_BASE_MS,
        })

        if (lockoutState.locked) {
          logger.warn("Blocked login attempt for locked account", {
            email,
            retryAfterMs: lockoutState.retryAfterMs,
          })
          auditEvent({
            action: "auth.login",
            status: "failure",
            actorEmail: email,
            ipAddress,
            metadata: { reason: "account-locked" },
          })
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          await consumeRateLimitPersistent(ipRateLimitKey, {
            limit: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
            windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
            blockDurationMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
          })
          await recordFailedLoginPersistent(email, {
            threshold: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
            windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
            baseLockMs: env.AUTH_LOCKOUT_BASE_MS,
          })
          auditEvent({
            action: "auth.login",
            status: "failure",
            actorEmail: email,
            ipAddress,
            metadata: { reason: "user-not-found" },
          })
          return null
        }

        if (!user.isActive) {
          await consumeRateLimitPersistent(ipRateLimitKey, {
            limit: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
            windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
            blockDurationMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
          })
          await recordFailedLoginPersistent(email, {
            threshold: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
            windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
            baseLockMs: env.AUTH_LOCKOUT_BASE_MS,
          })
          logger.warn("Blocked login for inactive user", {
            userId: user.id,
          })
          auditEvent({
            action: "auth.login",
            status: "failure",
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            ipAddress,
            metadata: { reason: "inactive-user" },
          })
          return null
        }

        if (!user.emailVerifiedAt) {
          logger.warn("Blocked login for unverified email address", {
            userId: user.id,
            email: user.email,
          })
          auditEvent({
            action: "auth.login",
            status: "failure",
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            ipAddress,
            metadata: { reason: "email-unverified" },
          })
          return null
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
          await consumeRateLimitPersistent(ipRateLimitKey, {
            limit: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
            windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
            blockDurationMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
          })
          const failedState = await recordFailedLoginPersistent(email, {
            threshold: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
            windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
            baseLockMs: env.AUTH_LOCKOUT_BASE_MS,
          })

          if (failedState.locked) {
            logger.warn("Locked account after repeated failed logins", {
              userId: user.id,
              retryAfterMs: failedState.retryAfterMs,
            })
          }

          auditEvent({
            action: "auth.login",
            status: "failure",
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            ipAddress,
            metadata: {
              reason: failedState.locked ? "account-locked" : "invalid-password",
            },
          })

          return null
        }

        if (user.twoFactorEnabled) {
          const hashedRecoveryCodes = parseStoredRecoveryCodes(user.twoFactorRecoveryCodes)
          const recoveryCodeResult = verifyRecoveryCode(recoveryCode, hashedRecoveryCodes)
          const secret =
            typeof user.twoFactorSecret === "string"
              ? decryptTwoFactorSecret(user.twoFactorSecret)
              : null
          const otpValid = secret ? verifyTotpToken(secret, otp ?? "") : false

          if (!otpValid && !recoveryCodeResult.valid) {
            logger.warn("Blocked login due to missing or invalid two-factor verification", {
              userId: user.id,
            })
            auditEvent({
              action: "auth.login",
              status: "failure",
              actorId: user.id,
              actorEmail: user.email,
              actorRole: user.role,
              ipAddress,
              metadata: { reason: "two-factor-invalid" },
            })
            return null
          }

          if (recoveryCodeResult.valid) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                twoFactorRecoveryCodes: recoveryCodeResult.remainingCodes,
              } satisfies import("@prisma/client").Prisma.UserUpdateInput,
            })
          }
        }

        await clearFailedLoginsPersistent(email)
        auditEvent({
          action: "auth.login",
          status: "success",
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          ipAddress,
        })
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
          sessionVersion: user.sessionVersion,
          twoFactorEnabled: user.twoFactorEnabled,
          rememberMe,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        ...(process.env.NODE_ENV === 'production' ? { domain: '.loomdesk.online' } : {}),
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.username = (user as any).username ?? null
        token.sessionVersion = user.sessionVersion ?? 0
        token.twoFactorEnabled = user.twoFactorEnabled ?? false
        token.rememberMe = user.rememberMe ?? false
        token.sessionExpiresAt = createSessionExpiryTimestamp(Boolean(token.rememberMe))
        token.lastDbCheck = Date.now()
        return token
      }

      if (!token.id || isSessionExpired(token.sessionExpiresAt)) {
        return null
      }

      const tokenUserId = typeof token.id === "string" ? token.id : null

      if (!tokenUserId) {
        return null
      }

      const now = Date.now()
      const lastCheck = (token.lastDbCheck as number) || 0

      // Only hit the DB once every 5 minutes to prevent connection pool exhaustion
      if (now - lastCheck < 5 * 60 * 1000) {
        return token
      }

      // Check in-memory cache to prevent concurrent SWR races
      const cached = globalSessionCache.get(tokenUserId)
      if (cached && now - cached.timestamp < 10000) {
        if (!cached.user || !cached.user.isActive || cached.user.sessionVersion !== token.sessionVersion) {
          return null
        }
        token.role = cached.user.role
        token.sessionVersion = cached.user.sessionVersion
        token.twoFactorEnabled = cached.user.twoFactorEnabled
        token.lastDbCheck = now
        return token
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: tokenUserId },
        select: {
          isActive: true,
          role: true,
          username: true,
          sessionVersion: true,
          twoFactorEnabled: true,
        },
      })

      globalSessionCache.set(tokenUserId, { timestamp: now, user: currentUser })

      if (!currentUser?.isActive) {
        return null
      }

      if (currentUser.sessionVersion !== token.sessionVersion) {
        return null
      }

      token.role = currentUser.role
      token.username = currentUser.username
      token.sessionVersion = currentUser.sessionVersion
      token.twoFactorEnabled = currentUser.twoFactorEnabled
      token.lastDbCheck = now
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        const u = session.user as any
        u.id = token.id as string
        u.role = token.role as string
        u.username = token.username as string | null
        u.rememberMe = !!token.rememberMe
        u.sessionVersion = +(token.sessionVersion ?? 0)
        u.twoFactorEnabled = !!token.twoFactorEnabled
        if (typeof token.sessionExpiresAt === "number") {
          session.expires = new Date(token.sessionExpiresAt).toISOString() as any
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
