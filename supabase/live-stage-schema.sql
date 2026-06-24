-- Live stage: viewers, join requests, and co-host guests
-- Run after live-schema.sql

-- Who is watching (heartbeat from clients)
create table if not exists public.live_stream_viewers (
  room_name text not null references public.live_streams (room_name) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_name, user_id)
);

create index if not exists live_stream_viewers_room_idx
  on public.live_stream_viewers (room_name, last_seen_at desc);

-- Request to join on stage / host invite
create table if not exists public.live_stream_join_requests (
  id uuid primary key default gen_random_uuid(),
  room_name text not null references public.live_streams (room_name) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_type text not null check (request_type in ('request', 'invite')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists live_stream_join_requests_room_idx
  on public.live_stream_join_requests (room_name, status, created_at desc);

create unique index if not exists live_stream_join_requests_pending_unique
  on public.live_stream_join_requests (room_name, user_id)
  where status = 'pending';

-- Approved co-hosts who may publish video/audio
create table if not exists public.live_stream_guests (
  room_name text not null references public.live_streams (room_name) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default now(),
  primary key (room_name, user_id)
);

alter table public.live_stream_viewers enable row level security;
alter table public.live_stream_join_requests enable row level security;
alter table public.live_stream_guests enable row level security;

-- Viewers: upsert own row; read anyone on live streams
drop policy if exists "Users manage own live presence" on public.live_stream_viewers;
create policy "Users manage own live presence"
  on public.live_stream_viewers for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Authenticated users read live viewers" on public.live_stream_viewers;
create policy "Authenticated users read live viewers"
  on public.live_stream_viewers for select
  to authenticated
  using (true);

-- Join requests
drop policy if exists "Users create own join requests" on public.live_stream_join_requests;
create policy "Users create own join requests"
  on public.live_stream_join_requests for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users read join requests for rooms they are in" on public.live_stream_join_requests;
create policy "Users read join requests for rooms they are in"
  on public.live_stream_join_requests for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.live_streams ls
      where ls.room_name = live_stream_join_requests.room_name
        and ls.host_id = auth.uid()
    )
  );

drop policy if exists "Hosts update join requests" on public.live_stream_join_requests;
create policy "Hosts update join requests"
  on public.live_stream_join_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.live_streams ls
      where ls.room_name = live_stream_join_requests.room_name
        and ls.host_id = auth.uid()
    )
  );

-- Guests
drop policy if exists "Hosts manage live guests" on public.live_stream_guests;
create policy "Hosts manage live guests"
  on public.live_stream_guests for all
  to authenticated
  using (
    exists (
      select 1 from public.live_streams ls
      where ls.room_name = live_stream_guests.room_name
        and ls.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.live_streams ls
      where ls.room_name = live_stream_guests.room_name
        and ls.host_id = auth.uid()
    )
  );

drop policy if exists "Guests read own guest row" on public.live_stream_guests;
create policy "Guests read own guest row"
  on public.live_stream_guests for select
  to authenticated
  using (user_id = auth.uid());

-- Realtime for join requests (host panel)
do $$
begin
  alter publication supabase_realtime add table public.live_stream_join_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.live_stream_guests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.live_stream_viewers;
exception when duplicate_object then null;
end $$;
