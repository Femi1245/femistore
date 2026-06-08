-- 24-hour statuses (WhatsApp / Stories style) — run AFTER social-schema.sql

create table if not exists public.status_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text default '',
  media_url text,
  media_type text not null check (media_type in ('text', 'image', 'video')),
  background_color text default '#b85c38',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists status_updates_user_expires_idx
  on public.status_updates (user_id, expires_at desc);

create index if not exists status_updates_active_idx
  on public.status_updates (expires_at desc);

create table if not exists public.status_views (
  status_id uuid not null references public.status_updates (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (status_id, viewer_id)
);

alter table public.status_updates enable row level security;
alter table public.status_views enable row level security;

drop policy if exists "Users create own statuses" on public.status_updates;
create policy "Users create own statuses"
  on public.status_updates for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users delete own statuses" on public.status_updates;
create policy "Users delete own statuses"
  on public.status_updates for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "View statuses from people you follow" on public.status_updates;
create policy "View statuses from people you follow"
  on public.status_updates for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid()
        and f.following_id = status_updates.user_id
    )
  );

drop policy if exists "Users record status views" on public.status_views;
create policy "Users record status views"
  on public.status_views for insert to authenticated
  with check (viewer_id = auth.uid());

drop policy if exists "Users read status views" on public.status_views;
create policy "Users read status views"
  on public.status_views for select to authenticated
  using (viewer_id = auth.uid());

-- Storage for status photos/videos
insert into storage.buckets (id, name, public)
values ('status-media', 'status-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Status media is publicly accessible" on storage.objects;
create policy "Status media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'status-media');

drop policy if exists "Users can upload status media" on storage.objects;
create policy "Users can upload status media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'status-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own status media" on storage.objects;
create policy "Users can delete own status media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'status-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
