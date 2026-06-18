# Loomdesk

Loomdesk is a team management dashboard built with Next.js 16, React 19, NextAuth v5, Prisma, and PostgreSQL. It handles reporting, QA scoring, attendance, leave, shifts, messaging, and team administration.

## Stack

- Next.js 16 App Router
- React 19
- NextAuth v5 credentials authentication
- Prisma + PostgreSQL
- Supabase for real-time notifications
- Node.js test runner with `tsx` for unit coverage

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in the required values.
3. Generate the Prisma client with `npm run postinstall` if it does not run automatically.
4. Start the app with `npm run dev`.

## Environment variables

Required server variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`

Optional but supported:

- `CORS_ALLOWED_ORIGINS`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `RESEND_API_KEY`
- `AUTH_RATE_LIMIT_MAX_ATTEMPTS`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_LOCKOUT_BASE_MS`
- `SESSION_MAX_AGE_MS`
- `SESSION_REMEMBER_ME_MAX_AGE_MS`
- `EMAIL_VERIFICATION_TOKEN_TTL_MS`
- `MESSAGE_RATE_LIMIT_MAX_REQUESTS`
- `MESSAGE_RATE_LIMIT_WINDOW_MS`
- `PASSWORD_RESET_TOKEN_TTL_MS`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Security hardening included

- Startup env validation via `lib/env.server.ts`
- Proxy-based route protection for private pages and APIs
- Login IP rate limiting and account lockouts
- Message send rate limiting
- Password reset request and confirmation flow with signed expiring tokens
- Email verification flow for new or changed email addresses
- TOTP-based two-factor authentication with recovery codes
- Transactional email delivery for invitations and password resets when Resend is configured
- Remember-me session expiry and server-side session invalidation support
- Persistent audit log schema and admin audit log API
- Database-backed rate limiting and account lockout tables with memory fallback
- Startup instrumentation for Node.js error logging
- Request ID propagation via `x-request-id`
- Security headers in `next.config.ts`
- Removal of exposed debug endpoints
- Safe `GET /api/health` readiness endpoint

## Scripts

- `npm run dev` starts the dev server
- `npm run build` builds the app
- `npm run start` starts the production server
- `npm run lint` runs ESLint
- `npm run typecheck` runs TypeScript without emitting files
- `npm run test` runs the Node.js test suite
- `npm run test:watch` runs the Node.js test suite in watch mode

## API notes

Key routes are documented in [docs/api.md](/docs/api.md).

## Testing and CI

GitHub Actions runs lint, typecheck, and tests on pushes and pull requests.

## Deployment

- A production Docker build is included in `Dockerfile`.
- Proxy attaches an `x-request-id` header to requests and responses for easier tracing.
- Root `instrumentation.ts` registers Node.js process-level error logging on server startup.
- Users can manage 2FA from the settings screen after signing in.

## Current limitations

- Account lockout and rate limiting are currently in-memory, so distributed deployments should move these controls to Redis or another shared store.
- Password reset currently generates preview links in non-production and logs audit events, but it still needs a real email delivery provider for production use.
- Invitations, email verification, and password resets send real email when `RESEND_API_KEY` and `EMAIL_FROM` are configured; otherwise they safely fall back to preview-mode links.
- Session invalidation requires the included `sessionVersion` migration to be applied before all-device sign-out and password-change revocation are enforced.
- Email verification requires the included Prisma migration before unverified-email login blocking and token issuance are fully available.
- Two-factor authentication requires the included Prisma migration before setup, login enforcement, and recovery codes are available.
- The duplicated route implementations have been consolidated to a single source of truth, but the app still preserves legacy `/dashboard/*` URLs via redirects for compatibility.
- Persistent audit storage needs the included Prisma migration applied in the target database before the API-backed audit trail is available.
- Persistent rate limiting and lockout storage also require the included Prisma migration before they move beyond in-memory fallback.
