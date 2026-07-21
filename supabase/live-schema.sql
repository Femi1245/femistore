-- Live video streams — run in Supabase SQL Editor

create table if not exists public.live_streams (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null default 'video'
    check (category in ('video', 'gaming', 'music', 'talk', 'events', 'shopping')),
  room_name text unique not null,
  is_live boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.live_streams
  add column if not exists category text not null default 'video';

alter table public.live_streams
  drop constraint if exists live_streams_category_check;

alter table public.live_streams
  add constraint live_streams_category_check
  check (category in ('video', 'gaming', 'music', 'talk', 'events', 'shopping'));

create index if not exists live_streams_live_idx
  on public.live_streams (is_live, started_at desc);

create index if not exists live_streams_category_live_idx
  on public.live_streams (category, is_live, started_at desc);

alter table public.live_streams enable row level security;

drop policy if exists "Anyone authenticated can view live streams" on public.live_streams;
create policy "Anyone authenticated can view live streams"
  on public.live_streams for select
  to authenticated
  using (true);

drop policy if exists "Hosts can create live streams" on public.live_streams;
create policy "Hosts can create live streams"
  on public.live_streams for insert
  to authenticated
  with check (host_id = auth.uid());

drop policy if exists "Hosts can update own streams" on public.live_streams;
create policy "Hosts can update own streams"
  on public.live_streams for update
  to authenticated
  using (host_id = auth.uid());
