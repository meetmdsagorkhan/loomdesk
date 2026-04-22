# API Overview

## Public endpoints

- `GET/POST /api/auth/*`
  Used by NextAuth and invite onboarding flows.
- `GET /api/health`
  Returns app readiness, dependency status, uptime, memory summary, and the current request ID for monitoring.
- `GET /api/audit-logs`
  Admin-only audit trail listing with optional filters for `action`, `actorId`, `targetId`, `status`, and `limit`.
- `GET /api/reset-password?token=...`
  Validates whether a password reset link is still valid.
- `POST /api/reset-password`
  Accepts either `{ email }` to start a reset request or `{ token, password }` to complete a reset.
- `GET/POST /api/email-verification`
  Confirm an email verification token or request a fresh verification link.

## Authenticated endpoints

- `GET /api/users`
  List active users for admins and team leads.
- `GET/POST /api/messages`
  Read messages and send a new message. Message sends are rate limited.
- `GET /api/messages/conversations`
  Return conversation summaries for the signed-in user.
- `POST /api/messages/mark-read`
  Mark conversation messages as read.
- `GET/POST /api/reports`
  List or create user reports.
- `GET /api/reports/today`
  Fetch the current day report for the signed-in user.
- `POST /api/reports/[id]/submit`
  Submit a draft report.
- `GET/POST /api/leave`
  List leave requests or create a new request.
- `GET/POST /api/user/sessions`
  Read the current session metadata or revoke all active sessions for the signed-in user.
- `GET/POST /api/user/two-factor`
  Read 2FA status, start setup, enable TOTP, disable it, or regenerate recovery codes for the signed-in user.
- `PATCH /api/leave/[id]`
  Admin review flow for leave requests.
- `GET/POST /api/shifts`
  View or create shifts.
- `POST /api/shifts/assign`
  Assign users to shifts.
- `GET /api/analytics/summary`
  Dashboard analytics summary.

## Auth behavior

- Private page routes are enforced in `proxy.ts`.
- Private API routes return `401` before hitting most handlers when no session cookie is present.
- Route handlers still keep their own authorization checks and role checks.
- Credentials sign-in supports a `rememberMe` flag, and password resets or session revocation bump `sessionVersion` to invalidate older JWT sessions.
- Credentials sign-in blocks unverified email addresses until the `/api/email-verification` flow completes.
- Credentials sign-in also enforces a TOTP code or recovery code when 2FA is enabled for the account.
- Proxy propagates `x-request-id` so API responses can be correlated with server logs.

## Error format

Most handlers return JSON with an `error` field for failures and use standard HTTP status codes such as `400`, `401`, `403`, `404`, `429`, and `500`.

## Migration note

Persistent audit logging requires the `AuditLog` table introduced in `prisma/migrations/20260422173000_add_audit_log/migration.sql`. If that migration has not been applied yet, audit events still fall back to structured server logs.

Persistent session invalidation requires the `sessionVersion` column introduced in `prisma/migrations/20260422201500_add_session_version/migration.sql`.

Email verification requires the `emailVerifiedAt` user column and `EmailVerificationToken` table introduced in `prisma/migrations/20260422213000_add_email_verification/migration.sql`.

Two-factor authentication requires the `twoFactorEnabled`, `twoFactorSecret`, `twoFactorRecoveryCodes`, and `twoFactorConfirmedAt` columns introduced in `prisma/migrations/20260422233000_add_two_factor_auth/migration.sql`.
