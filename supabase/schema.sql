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
