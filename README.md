# Loomdesk - AI-Complete Project Specification

## Overview

**Loomdesk** is a production-grade Customer Support Operations Management System built with:
- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS 3.4
- Supabase (PostgreSQL + Auth)
- Nodemailer for SMTP
- shadcn/ui component patterns

## Features

- **Role-based access control**: Admin and Member roles
- **Invitation system**: Admin invites members via email with expiring tokens
- **Daily reports**: Members submit chat/ticket work reports
- **Audit system**: Admins audit entries, mark issues, deduct points (0-1 per audit)
- **Performance tracking**: Monthly scores starting at 100 with deductions
- **Messaging**: Admin can send reminders, warnings, and notes to members
- **CSV export**: Export monthly performance data
- **Responsive design**: Glassmorphism UI with sidebar layout

## Project Structure

```
loomdesk/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (protected)/
│   │   ├── admin/
│   │   │   └── page.tsx
│   │   ├── member/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── audits/
│   │   │   └── route.ts
│   │   ├── auth/
│   │   │   └── logout/
│   │   │       └── route.ts
│   │   ├── export/
│   │   │   └── performance/
│   │   │       └── route.ts
│   │   ├── invites/
│   │   │   ├── route.ts
│   │   │   └── [token]/
│   │   │       └── accept/
│   │   │           └── route.ts
│   │   ├── messages/
│   │   │   └── route.ts
│   │   ├── performance/
│   │   │   └── route.ts
│   │   └── reports/
│   │       └── route.ts
│   ├── invite/
│   │   └── [token]/
│   │       └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── admin/
│   │   ├── audit-panel.tsx
│   │   ├── calendar-view.tsx
│   │   ├── score-board.tsx
│   │   └── team-management.tsx
│   ├── auth/
│   │   ├── accept-invite-form.tsx
│   │   └── login-form.tsx
│   ├── dashboard/
│   │   ├── admin-dashboard.tsx
│   │   └── member-dashboard.tsx
│   ├── layout/
│   │   └── app-sidebar.tsx
│   ├── messages/
│   │   └── message-center.tsx
│   ├── report/
│   │   ├── entry-table.tsx
│   │   └── report-form.tsx
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── skeleton.tsx
│       ├── table.tsx
│       └── textarea.tsx
├── lib/
│   ├── services/
│   │   ├── audit-service.ts
│   │   ├── invite-service.ts
│   │   ├── message-service.ts
│   │   ├── performance-service.ts
│   │   └── report-service.ts
│   ├── supabase/
│   │   ├── admin.ts
│   │   ├── client.ts
│   │   └── server.ts
│   ├── api.ts
│   ├── auth.ts
│   ├── constants.ts
│   ├── env.ts
│   ├── errors.ts
│   ├── http.ts
│   ├── mail.ts
│   ├── ui.ts
│   ├── utils.ts
│   └── validations.ts
├── supabase/
│   └── schema.sql
├── types/
│   ├── app.ts
│   └── database.ts
├── public/
│   ├── icon.png
│   └── logo.png
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json
├── middleware.ts
└── .env.example
```

## File Contents

### Configuration Files

#### package.json
```json
{
  "name": "loomdesk",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.49.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.511.0",
    "next": "^15.3.0",
    "nodemailer": "^6.10.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "recharts": "^2.15.3",
    "sonner": "^2.0.3",
    "tailwind-merge": "^2.6.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^22.13.10",
    "@types/nodemailer": "^6.4.17",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.22.0",
    "eslint-config-next": "^15.3.0",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.2"
  }
}
```

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### next.config.ts
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
```

#### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))"
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        panel: "0 24px 64px -32px rgba(15, 23, 42, 0.4)"
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
```

#### postcss.config.js
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

#### components.json
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

#### .env.example
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=loomdesk@example.com
```

### Database Schema

#### supabase/schema.sql
```sql
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'member');
  end if;

  if not exists (select 1 from pg_type where typname = 'invite_status') then
    create type public.invite_status as enum ('pending', 'accepted', 'expired', 'revoked');
  end if;

  if not exists (select 1 from pg_type where typname = 'entry_type') then
    create type public.entry_type as enum ('chat', 'ticket');
  end if;

  if not exists (select 1 from pg_type where typname = 'entry_status') then
    create type public.entry_status as enum ('solved', 'pending');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_type') then
    create type public.message_type as enum ('reminder', 'warning', 'note');
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  constraint users_email_lowercase check (email = lower(email))
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  expires_at timestamptz not null,
  status public.invite_status not null default 'pending',
  invited_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  constraint invites_email_lowercase check (email = lower(email))
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, date)
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  type public.entry_type not null,
  session_id text not null,
  status public.entry_status not null,
  pending_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint entries_session_id_not_empty check (length(trim(session_id)) > 0),
  constraint pending_reason_required check (
    (status = 'pending' and pending_reason is not null and length(trim(pending_reason)) > 0)
    or status = 'solved'
  )
);

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  issue_found boolean not null default false,
  note text,
  points_deducted integer not null default 0 check (points_deducted between 0 and 1),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.message_type not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users(id) on delete set null,
  constraint messages_text_not_empty check (length(trim(message)) > 0)
);

create index if not exists idx_invites_email on public.invites(email);
create index if not exists idx_invites_status on public.invites(status);
create index if not exists idx_reports_user_date on public.reports(user_id, date desc);
create index if not exists idx_entries_report_id on public.entries(report_id);
create index if not exists idx_audits_user_created_at on public.audits(user_id, created_at desc);
create index if not exists idx_messages_user_created_at on public.messages(user_id, created_at desc);
create unique index if not exists idx_pending_invites_per_email
  on public.invites(email)
  where status = 'pending';

create or replace view public.monthly_scores as
select
  a.user_id,
  to_char(date_trunc('month', a.created_at), 'YYYY-MM') as month,
  greatest(100 - coalesce(sum(a.points_deducted), 0), 0)::integer as score,
  count(*) filter (where a.issue_found) :: integer as issues_count,
  coalesce(sum(a.points_deducted), 0)::integer as deductions
from public.audits a
group by a.user_id, date_trunc('month', a.created_at);

alter table public.users enable row level security;
alter table public.invites enable row level security;
alter table public.reports enable row level security;
alter table public.entries enable row level security;
alter table public.audits enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "users_select_self_or_admin" on public.users;
create policy "users_select_self_or_admin"
on public.users
for select
to authenticated
using (auth.uid() = id or public.is_admin());

drop policy if exists "reports_select_self_or_admin" on public.reports;
create policy "reports_select_self_or_admin"
on public.reports
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "reports_insert_self" on public.reports;
create policy "reports_insert_self"
on public.reports
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "reports_update_self" on public.reports;
create policy "reports_update_self"
on public.reports
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "entries_select_via_report_or_admin" on public.entries;
create policy "entries_select_via_report_or_admin"
on public.entries
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reports r
    where r.id = report_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "entries_insert_via_own_report" on public.entries;
create policy "entries_insert_via_own_report"
on public.entries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.reports r
    where r.id = report_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "entries_update_via_own_report" on public.entries;
create policy "entries_update_via_own_report"
on public.entries
for update
to authenticated
using (
  exists (
    select 1
    from public.reports r
    where r.id = report_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.reports r
    where r.id = report_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "audits_select_self_or_admin" on public.audits;
create policy "audits_select_self_or_admin"
on public.audits
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "audits_insert_admin" on public.audits;
create policy "audits_insert_admin"
on public.audits
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "messages_select_self_or_admin" on public.messages;
create policy "messages_select_self_or_admin"
on public.messages
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "messages_insert_admin" on public.messages;
create policy "messages_insert_admin"
on public.messages
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "invites_admin_only" on public.invites;
create policy "invites_admin_only"
on public.invites
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
```

### Core Application Files

#### app/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 210 40% 98%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;
  --primary: 199 89% 48%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 94%;
  --secondary-foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --accent: 190 95% 90%;
  --accent-foreground: 222 47% 11%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 210 40% 98%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 199 89% 48%;
  --success: 142 71% 45%;
  --success-foreground: 210 40% 98%;
  --warning: 38 92% 50%;
  --warning-foreground: 24 10% 10%;
  --radius: 1rem;
}

* {
  border-color: hsl(var(--border));
}

body {
  min-height: 100vh;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

#### app/layout.tsx
```typescript
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { APP_NAME } from "@/lib/constants";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Customer support operations management system",
  icons: {
    icon: "/icon.png"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

#### app/page.tsx
```typescript
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  redirect(profile?.role === "admin" ? "/admin" : "/member");
}
```

#### app/(auth)/login/page.tsx
```typescript
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_rgba(14,165,233,0.15),_rgba(15,23,42,0.12)),radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_rgba(226,232,240,0.9))] px-4 py-12">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:42px_42px]" />
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
```

#### app/(protected)/layout.tsx
```typescript
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getSessionForPage } from "@/lib/auth";
import { dashboardShellClassName } from "@/lib/ui";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getSessionForPage();

  return (
    <div className={dashboardShellClassName}>
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[280px_1fr] lg:px-6">
        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <AppSidebar user={session.profile} />
        </div>
        <main className="rounded-[2rem] border border-white/60 bg-white/70 p-4 shadow-panel backdrop-blur md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### app/(protected)/admin/page.tsx
```typescript
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { redirectIfWrongRole } from "@/lib/auth";

export default async function AdminPage() {
  const session = await redirectIfWrongRole("admin");
  return <AdminDashboard user={session.profile} />;
}
```

#### app/(protected)/member/page.tsx
```typescript
import { MemberDashboard } from "@/components/dashboard/member-dashboard";
import { redirectIfWrongRole } from "@/lib/auth";

export default async function MemberPage() {
  const session = await redirectIfWrongRole("member");
  return <MemberDashboard user={session.profile} />;
}
```

### Middleware

#### middleware.ts
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/invite");
  const isApiRoute = pathname.startsWith("/api");

  if (!user && !isAuthRoute && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*))"]
};
```

### Library Files

#### lib/constants.ts
```typescript
export const APP_NAME = "Loomdesk";
export const REPORT_ENTRY_TYPES = ["chat", "ticket"] as const;
export const ENTRY_STATUSES = ["solved", "pending"] as const;
export const INVITE_STATUS = ["pending", "accepted", "expired", "revoked"] as const;
export const MESSAGE_TYPES = ["reminder", "warning", "note"] as const;
export const USER_ROLES = ["admin", "member"] as const;
export const MONTHLY_START_SCORE = 100;
```

#### lib/utils.ts
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

export function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

export function toTitleCase(value: string) {
  return value
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
```

#### lib/ui.ts
```typescript
export const dashboardShellClassName =
  "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(248,250,252,0.9)_35%,_rgba(226,232,240,0.85)_100%)] bg-grid-pattern bg-[size:36px_36px]";
```

#### lib/errors.ts
```typescript
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}
```

#### lib/http.ts
```typescript
import { NextResponse } from "next/server";
import { AppError, toErrorMessage } from "@/lib/errors";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
}
```

#### lib/validations.ts
```typescript
import { z } from "zod";
import { ENTRY_STATUSES, MESSAGE_TYPES, REPORT_ENTRY_TYPES, USER_ROLES } from "@/lib/constants";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(USER_ROLES).default("member"),
  expiresInDays: z.coerce.number().int().min(1).max(14).default(7)
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72)
});

export const reportEntrySchema = z
  .object({
    id: z.string().optional(),
    type: z.enum(REPORT_ENTRY_TYPES),
    session_id: z.string().min(1, "Session ID is required"),
    status: z.enum(ENTRY_STATUSES),
    pending_reason: z.string().nullable().optional()
  })
  .superRefine((value, ctx) => {
    if (value.status === "pending" && !value.pending_reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pending_reason"],
        message: "Pending entries require a reason"
      });
    }
  });

export const reportSchema = z.object({
  date: z.string().date(),
  entries: z.array(reportEntrySchema).min(1, "At least one entry is required")
});

export const auditSchema = z.object({
  user_id: z.string().uuid(),
  entry_id: z.string().uuid(),
  issue_found: z.boolean(),
  note: z.string().trim().max(500).nullable().optional(),
  points_deducted: z.coerce.number().int().min(0).max(1).default(0)
});

export const messageSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(MESSAGE_TYPES),
  message: z.string().trim().min(5).max(1000)
});

export const reportQuerySchema = z.object({
  month: z.string().optional(),
  userId: z.string().uuid().optional()
});
```

#### lib/env.ts
```typescript
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email()
});

const rawEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM
};

export function getEnv() {
  return envSchema.parse(rawEnv);
}
```

#### lib/auth.ts
```typescript
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export async function getCurrentUserProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError("Unauthorized", 401);
  }

  const admin = createAdminSupabaseClient();
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new AppError("User profile not found", 403);
  }

  return {
    authUser: user,
    profile
  };
}

export async function requireRole(role: UserRow["role"]) {
  const currentUser = await getCurrentUserProfile();

  if (currentUser.profile.role !== role) {
    throw new AppError("Forbidden", 403);
  }

  return currentUser;
}

export async function getSessionForPage() {
  try {
    return await getCurrentUserProfile();
  } catch {
    redirect("/login");
  }
}

export async function redirectIfWrongRole(expectedRole: UserRow["role"]) {
  const session = await getSessionForPage();

  if (session.profile.role !== expectedRole) {
    redirect(session.profile.role === "admin" ? "/admin" : "/member");
  }

  return session;
}
```

#### lib/mail.ts
```typescript
import nodemailer from "nodemailer";
import { getEnv } from "@/lib/env";

function getTransporter() {
  const env = getEnv();

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });
}

export async function sendInviteEmail(params: { email: string; inviteLink: string; expiresAt: string }) {
  const env = getEnv();
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: params.email,
    subject: "You have been invited to Loomdesk",
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px;line-height:1.6;">
        <h2>Loomdesk Invitation</h2>
        <p>You have been invited to join your support operations workspace.</p>
        <p><a href="${params.inviteLink}">Accept invitation</a></p>
        <p>This link expires on ${new Date(params.expiresAt).toLocaleString()}.</p>
      </div>
    `
  });
}

export async function sendAdminMessageEmail(params: {
  email: string;
  type: string;
  message: string;
}) {
  const env = getEnv();
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: params.email,
    subject: `New ${params.type} from Loomdesk`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px;line-height:1.6;">
        <h2>New ${params.type}</h2>
        <p>${params.message}</p>
        <p>Please sign in to Loomdesk for more details.</p>
      </div>
    `
  });
}
```

### Supabase Clients

#### lib/supabase/server.ts
```typescript
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Middleware refresh handles cookie persistence for server components.
          }
        }
      }
    }
  );
}
```

#### lib/supabase/client.ts
```typescript
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

#### lib/supabase/admin.ts
```typescript
import { createClient } from "@supabase/supabase-js";

export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
```

### Types

#### types/database.ts
```typescript
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "admin" | "member";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type EntryType = "chat" | "ticket";
export type EntryStatus = "solved" | "pending";
export type MessageType = "reminder" | "warning" | "note";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
      };
      invites: {
        Row: {
          id: string;
          email: string;
          token: string;
          expires_at: string;
          status: InviteStatus;
          invited_by: string | null;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          token: string;
          expires_at: string;
          status?: InviteStatus;
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invites"]["Row"]>;
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
      };
      entries: {
        Row: {
          id: string;
          report_id: string;
          type: EntryType;
          session_id: string;
          status: EntryStatus;
          pending_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          type: EntryType;
          session_id: string;
          status: EntryStatus;
          pending_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["entries"]["Row"]>;
      };
      audits: {
        Row: {
          id: string;
          user_id: string;
          entry_id: string;
          issue_found: boolean;
          note: string | null;
          points_deducted: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry_id: string;
          issue_found?: boolean;
          note?: string | null;
          points_deducted?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audits"]["Row"]>;
      };
      messages: {
        Row: {
          id: string;
          user_id: string;
          type: MessageType;
          message: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: MessageType;
          message: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
      };
    };
    Views: {
      monthly_scores: {
        Row: {
          user_id: string;
          month: string;
          score: number;
          issues_count: number;
          deductions: number;
        };
      };
    };
  };
}
```

#### types/app.ts
```typescript
import type { Database } from "@/types/database";

export type UserRecord = Database["public"]["Tables"]["users"]["Row"];
export type InviteRecord = Database["public"]["Tables"]["invites"]["Row"];
export type AuditRecord = Database["public"]["Tables"]["audits"]["Row"];
export type EntryRecord = Database["public"]["Tables"]["entries"]["Row"] & {
  audits?: AuditRecord[];
};
export type ReportRecord = Database["public"]["Tables"]["reports"]["Row"] & {
  users?: Pick<UserRecord, "email" | "role"> | null;
  entries: EntryRecord[];
};
export type MessageRecord = Database["public"]["Tables"]["messages"]["Row"] & {
  user?: Pick<UserRecord, "email"> | null;
  creator?: Pick<UserRecord, "email"> | null;
};
export type PerformanceRecord = {
  user_id: string;
  month: string;
  score: number;
  issues_count: number;
  deductions: number;
  users?: Pick<UserRecord, "email"> | null;
};
```

## Setup Instructions

### 1. Create Project
```bash
npx create-next-app@latest loomdesk --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd loomdesk
```

### 2. Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr zod date-fns nodemailer sonner recharts class-variance-authority clsx tailwind-merge lucide-react
npm install -D @types/nodemailer
```

### 3. Environment Setup
Create `.env.local` from `.env.example` and fill in your Supabase and SMTP credentials.

### 4. Database Setup
1. Create a Supabase project
2. Run the SQL in `supabase/schema.sql` in the SQL Editor
3. Create your first admin user in Supabase Auth
4. Insert the admin profile:
```sql
insert into public.users (id, email, role)
values ('YOUR_AUTH_USER_ID', 'admin@company.com', 'admin');
```

### 5. Add Logo Assets
Place `logo.png` (full logo with text) and `icon.png` (icon only) in the `public/` folder.

### 6. Run Development Server
```bash
npm run dev
```

## Key Design Patterns

### Glassmorphism UI
- Background: Radial gradient with grid pattern
- Cards: `bg-white/70 backdrop-blur` with `border-white/60`
- Sidebar: `bg-white/80 backdrop-blur` with `shadow-panel`
- Border radius: `rounded-[2rem]` for main panels, `rounded-2xl` for cards

### Role-Based Access
- Middleware handles auth redirects
- Server components use `redirectIfWrongRole()`
- API routes use `requireRole()`
- Row Level Security (RLS) policies in database

### Component Architecture
- shadcn/ui pattern: `cva` for variants, `cn()` for class merging
- Server components for data fetching
- Client components for interactivity (forms, tables)
- Service layer for business logic

### Data Flow
1. Server components fetch via service layer
2. Service layer uses admin Supabase client
3. API routes validate with Zod schemas
4. Client components call API routes
5. Database enforces RLS policies

## API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/reports` | GET | Any | List reports (scoped by role) |
| `/api/reports` | POST | Member | Submit daily report |
| `/api/audits` | POST | Admin | Create audit for entry |
| `/api/invites` | GET | Admin | List members and invites |
| `/api/invites` | POST | Admin | Create invitation |
| `/api/invites/[token]/accept` | POST | Public | Accept invitation |
| `/api/messages` | GET | Any | List messages |
| `/api/messages` | POST | Admin | Send message |
| `/api/performance` | GET | Any | Get performance scores |
| `/api/export/performance` | GET | Admin | CSV export |
| `/api/auth/logout` | POST | Any | Sign out |

## File Generation Notes for AI

When reconstructing this project:
1. Maintain exact file paths and naming
2. Use TypeScript strict mode
3. Follow the shadcn/ui component patterns
4. Ensure all Zod schemas match database constraints
5. Maintain RLS policies exactly as defined
6. Use `cn()` utility for all className merging
7. Keep service layer separate from components
8. Use server components by default, only "use client" when needed
