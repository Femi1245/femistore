-- Zumelia Watch — run in Supabase SQL Editor AFTER social-schema.sql

-- Watch history
create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  video_key text not null,
  source text not null check (source in ('stream', 'upload')),
  title text not null,
  channel_title text,
  thumbnail_url text,
  watched_at timestamptz not null default now(),
  unique (user_id, video_key, source)
);

create index if not exists watch_history_user_watched_idx
  on public.watch_history (user_id, watched_at desc);

-- Playlists
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create index if not exists playlists_user_idx on public.playlists (user_id, created_at desc);

-- Playlist items
create table if not exists public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  video_key text not null,
  source text not null check (source in ('stream', 'upload')),
  title text not null,
  channel_title text,
  thumbnail_url text,
  position int not null default 0,
  added_at timestamptz not null default now(),
  unique (playlist_id, video_key, source)
);

create index if not exists playlist_items_playlist_idx
  on public.playlist_items (playlist_id, position);

-- User-uploaded videos
create table if not exists public.user_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text default '',
  storage_path text not null,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create index if not exists user_videos_user_idx
  on public.user_videos (user_id, created_at desc);

-- RLS
alter table public.watch_history enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.user_videos enable row level security;

drop policy if exists "Users manage own watch history" on public.watch_history;
create policy "Users manage own watch history"
  on public.watch_history for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users manage own playlists" on public.playlists;
create policy "Users manage own playlists"
  on public.playlists for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users manage items in own playlists" on public.playlist_items;
create policy "Users manage items in own playlists"
  on public.playlist_items for all to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Anyone authenticated can view uploads" on public.user_videos;
create policy "Anyone authenticated can view uploads"
  on public.user_videos for select to authenticated using (true);

drop policy if exists "Users manage own uploads" on public.user_videos;
create policy "Users manage own uploads"
  on public.user_videos for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users delete own uploads" on public.user_videos;
create policy "Users delete own uploads"
  on public.user_videos for delete to authenticated
  using (user_id = auth.uid());

-- Storage bucket for user videos
insert into storage.buckets (id, name, public)
values ('user-videos', 'user-videos', true)
on conflict (id) do update set public = true;

drop policy if exists "User videos are publicly accessible" on storage.objects;
create policy "User videos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'user-videos');

drop policy if exists "Users can upload own videos" on storage.objects;
create policy "Users can upload own videos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'user-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own videos" on storage.objects;
create policy "Users can delete own videos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'user-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
