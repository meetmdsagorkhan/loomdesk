# Loomdesk

Production-grade Customer Support Operations Management System built with Next.js App Router, Supabase, Tailwind CSS, and shadcn-style reusable UI components.

## Stack

- Next.js App Router
- React hooks
- Tailwind CSS
- shadcn-style local UI components
- Supabase PostgreSQL + Supabase Auth
- Nodemailer SMTP email delivery
- Vercel deployment target

## Features

- Admin invite flow with expiring email tokens
- Member invite acceptance with password setup
- Role-based dashboards for `admin` and `member`
- Daily report submission for chat and ticket work
- Audit panel with issue marking and one-point deductions
- Monthly performance tracking with alerts below 90
- Admin reminder, warning, and note messaging
- CSV export for monthly performance
- Responsive SaaS-style layout with cards, tables, dialogs, charts, loading states, and toast notifications

## Project Structure

```text
app/
  (auth)/login/page.tsx
  (protected)/admin/page.tsx
  (protected)/member/page.tsx
  api/
components/
  admin/
  auth/
  dashboard/
  layout/
  messages/
  report/
  ui/
lib/
  services/
  supabase/
supabase/
  schema.sql
types/
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=support-ops@example.com
```

## Supabase Setup Guide

1. Create a new Supabase project.
2. In the SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql).
3. In Supabase Auth, keep Email provider enabled.
4. Create your first admin user in Supabase Auth.
5. Insert the matching admin profile row in `public.users` using the same auth user id.

Example bootstrap SQL:

```sql
insert into public.users (id, email, role)
values ('YOUR_AUTH_USER_ID', 'admin@company.com', 'admin');
```

6. Add your project URL, anon key, and service role key to `.env.local`.
7. Configure SMTP credentials for invitations and operational emails.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Notes

- Deploy the app to Vercel.
- Add the same environment variables in Vercel Project Settings.
- Set `NEXT_PUBLIC_APP_URL` to your production domain.
- Use a real SMTP provider for invite delivery and reminder/warning/note emails.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

## Core Workflows

### Admin

- Invite members from Team Management
- Review reports in Calendar View
- Audit entries and deduct points
- Send reminders, warnings, and notes
- Export monthly score data as CSV from `/api/export/performance?month=YYYY-MM`

### Member

- Accept invite from emailed tokenized link
- Set password and sign in
- Submit daily reports with dynamic entries
- Review score and report history
- Read admin messages

## Notes

- Business logic lives in `lib/services`.
- API routes are under `app/api`.
- Session-aware page protection is handled by `middleware.ts` plus server-side role checks.
- The schema adds a small set of operational metadata fields (`invited_by`, `accepted_at`, `created_by`) to support auditability.
