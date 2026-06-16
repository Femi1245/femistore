-- Edit window, last seen, and per-user chat themes — run after messaging + social schemas.

-- ── Last seen on profiles ─────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_last_seen_idx
  on public.profiles (last_seen_at desc nulls last);

-- ── Edited timestamps ───────────────────────────────────────────────────────
alter table public.posts
  add column if not exists edited_at timestamptz;

alter table public.messages
  add column if not exists edited_at timestamptz;

-- ── Post edit policy (own posts, within 5 minutes) ────────────────────────────
drop policy if exists "Users can edit own posts within 5 minutes" on public.posts;
create policy "Users can edit own posts within 5 minutes"
  on public.posts for update to authenticated
  using (
    user_id = auth.uid()
    and created_at > now() - interval '5 minutes'
  )
  with check (user_id = auth.uid());

-- ── Message edit policy (own text messages, within 5 minutes) ───────────────
drop policy if exists "Users can edit own messages within 5 minutes" on public.messages;
create policy "Users can edit own messages within 5 minutes"
  on public.messages for update to authenticated
  using (
    sender_id = auth.uid()
    and coalesce(message_type, 'text') = 'text'
    and created_at > now() - interval '5 minutes'
  )
  with check (sender_id = auth.uid());

-- ── Per-user chat wallpaper (private to each member) ──────────────────────────
create table if not exists public.conversation_member_settings (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  wallpaper_type text not null default 'default'
    check (wallpaper_type in ('default', 'color', 'image')),
  wallpaper_color text,
  wallpaper_url text,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_member_settings enable row level security;

drop policy if exists "Users can view own chat settings" on public.conversation_member_settings;
create policy "Users can view own chat settings"
  on public.conversation_member_settings for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can upsert own chat settings" on public.conversation_member_settings;
create policy "Users can upsert own chat settings"
  on public.conversation_member_settings for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_member_settings.conversation_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own chat settings" on public.conversation_member_settings;
create policy "Users can update own chat settings"
  on public.conversation_member_settings for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Chat wallpaper storage ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('chat-wallpapers', 'chat-wallpapers', true)
on conflict (id) do update set public = true;

drop policy if exists "Chat wallpapers are publicly accessible" on storage.objects;
create policy "Chat wallpapers are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'chat-wallpapers');

drop policy if exists "Users can upload chat wallpapers" on storage.objects;
create policy "Users can upload chat wallpapers"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-wallpapers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own chat wallpapers" on storage.objects;
create policy "Users can delete own chat wallpapers"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-wallpapers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
