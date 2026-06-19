-- Automated email log — run after schema.sql + social-schema.sql
-- Prevents duplicate birthday / purchase emails. Used by src/lib/email-notifications.ts

create table if not exists public.email_notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_type text not null
    check (notification_type in ('birthday', 'purchase')),
  reference_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, notification_type, reference_key)
);

create index if not exists email_notification_log_user_idx
  on public.email_notification_log (user_id, sent_at desc);

alter table public.email_notification_log enable row level security;

-- Only server (service role) reads/writes this table; no client policies.
