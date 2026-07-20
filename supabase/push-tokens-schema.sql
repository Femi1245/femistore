-- Push notification device tokens (Expo Push for mobile app)
-- Run in Supabase SQL Editor after notifications-schema.sql

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.push_tokens;
create policy "Users manage own push tokens"
  on public.push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- After deploying /api/push/dispatch, add a Supabase Database Webhook:
-- Table: notifications | Events: INSERT | URL: https://itunes-mu.vercel.app/api/push/dispatch
-- Header: Authorization: Bearer <PUSH_WEBHOOK_SECRET>
