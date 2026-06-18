-- ═══════════════════════════════════════════════════════════════════════════
-- Zumelia opportunities — SAFE TO RE-RUN
-- Run in Supabase SQL Editor (fixes pin/translate/archive + business contact)
--
-- Prerequisites (run first if verify-setup still shows other MISSING rows):
--   edit-presence-themes-schema.sql, business-accounts-schema.sql,
--   assistant-bot-schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Ensure chat settings table exists ────────────────────────────────────────
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

-- ── Pin, archive, translation columns ───────────────────────────────────────
alter table public.conversation_member_settings
  add column if not exists is_pinned boolean not null default false;

alter table public.conversation_member_settings
  add column if not exists pinned_at timestamptz;

alter table public.conversation_member_settings
  add column if not exists is_archived boolean not null default false;

alter table public.conversation_member_settings
  add column if not exists archived_at timestamptz;

alter table public.conversation_member_settings
  add column if not exists translation_enabled boolean not null default false;

alter table public.conversation_member_settings
  add column if not exists translation_target_lang text not null default 'en';

-- ── Business contact / auto-reply / featured on profiles ─────────────────────
alter table public.profiles
  add column if not exists business_contact_enabled boolean not null default true;

alter table public.profiles
  add column if not exists business_auto_reply_enabled boolean not null default false;

alter table public.profiles
  add column if not exists business_auto_reply_message text not null default '';

alter table public.profiles
  add column if not exists business_featured boolean not null default false;

alter table public.profiles
  add column if not exists business_featured_at timestamptz;

create index if not exists profiles_business_featured_idx
  on public.profiles (business_featured, business_featured_at desc nulls last)
  where business_featured = true;

-- ── Assistant helpers (no-op if assistant-bot-schema.sql already ran) ────────
create or replace function public.zumelia_assistant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where username = 'zumelia-ai' limit 1;
$$;

create or replace function public.is_zumelia_assistant(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_id = public.zumelia_assistant_id();
$$;

-- ── DM assistant + businesses without mutual follow ──────────────────────────
create or replace function public.can_dm_without_mutual_friends(other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_zumelia_assistant(other_id)
    or exists (
      select 1 from public.profiles p
      where p.id = other_id
        and coalesce(p.business_contact_enabled, true) = true
        and (p.business_enabled = true or p.account_kind = 'business')
        and p.business_name is not null
        and char_length(trim(p.business_name)) > 0
    );
$$;

drop policy if exists "Members can send messages by conversation type" on public.messages;
create policy "Members can send messages by conversation type"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
    and (
      exists (
        select 1 from public.conversations c
        where c.id = messages.conversation_id and c.kind = 'group'
      )
      or exists (
        select 1
        from public.conversation_members cm
        join public.conversations c on c.id = cm.conversation_id
        where cm.conversation_id = messages.conversation_id
          and cm.user_id = auth.uid()
          and c.kind = 'channel'
          and cm.role in ('owner', 'admin')
      )
      or (
        exists (
          select 1 from public.conversations c
          where c.id = messages.conversation_id and c.kind = 'dm'
        )
        and not exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = messages.conversation_id
            and cm.user_id <> auth.uid()
            and not public.can_dm_without_mutual_friends(cm.user_id)
            and not public.are_mutual_friends(auth.uid(), cm.user_id)
        )
      )
    )
  );

-- ── Quick confirmation ───────────────────────────────────────────────────────
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversation_member_settings'
      and column_name = 'is_pinned'
  ) as is_pinned_ok,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversation_member_settings'
      and column_name = 'translation_enabled'
  ) as translation_enabled_ok,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'business_contact_enabled'
  ) as business_contact_ok,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'can_dm_without_mutual_friends'
  ) as can_dm_without_mutual_friends_ok;
