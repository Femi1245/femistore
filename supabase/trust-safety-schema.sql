-- ═══════════════════════════════════════════════════════════════════════════
-- Zumelia trust & safety — SAFE TO RE-RUN
-- Run after opportunities-schema.sql in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Privacy columns on profiles ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_private boolean not null default false;

alter table public.profiles
  add column if not exists dm_policy text not null default 'friends'
    check (dm_policy in ('everyone', 'friends', 'business_only', 'nobody'));

alter table public.profiles
  add column if not exists show_last_seen boolean not null default true;

alter table public.profiles
  add column if not exists show_read_receipts boolean not null default true;

alter table public.profiles
  add column if not exists show_birthday boolean not null default true;

alter table public.profiles
  add column if not exists ai_assistant_enabled boolean not null default true;

alter table public.profiles
  add column if not exists digest_mode boolean not null default false;

alter table public.profiles
  add column if not exists quiet_hours_start time;

alter table public.profiles
  add column if not exists quiet_hours_end time;

alter table public.profiles
  add column if not exists profile_theme text not null default 'default'
    check (profile_theme in ('default', 'rust', 'olive', 'midnight', 'paper'));

alter table public.profiles
  add column if not exists profile_accent_color text;

-- ── Per-chat: mute notifications + last read ────────────────────────────────
alter table public.conversation_member_settings
  add column if not exists notifications_muted boolean not null default false;

alter table public.conversation_member_settings
  add column if not exists last_read_at timestamptz;

alter table public.conversation_member_settings
  add column if not exists folder_id uuid;

-- ── Blocks & mutes ──────────────────────────────────────────────────────────
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.user_mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

-- ── Reports & appeals ─────────────────────────────────────────────────────────
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('user', 'post', 'message', 'comment')),
  target_id text not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists content_reports_status_idx
  on public.content_reports (status, created_at desc);

create table if not exists public.account_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reference_id text not null default gen_random_uuid()::text,
  subject text not null,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists account_appeals_user_idx
  on public.account_appeals (user_id, created_at desc);

-- ── DM requests (strangers) ───────────────────────────────────────────────────
create table if not exists public.dm_requests (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  preview text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (conversation_id, to_user_id)
);

create index if not exists dm_requests_recipient_idx
  on public.dm_requests (to_user_id, status, created_at desc);

-- ── Chat folders ──────────────────────────────────────────────────────────────
create table if not exists public.chat_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists chat_folders_user_idx
  on public.chat_folders (user_id, sort_order);

-- folder_id FK on conversation_member_settings
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'conversation_member_settings_folder_id_fkey'
  ) then
    alter table public.conversation_member_settings
      add constraint conversation_member_settings_folder_id_fkey
      foreign key (folder_id) references public.chat_folders (id) on delete set null;
  end if;
exception when others then null;
end $$;

-- ── Keyword mutes ───────────────────────────────────────────────────────────
create table if not exists public.keyword_mutes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  keyword text not null,
  created_at timestamptz not null default now(),
  unique (user_id, keyword)
);

-- ── Notification preferences ──────────────────────────────────────────────────
create table if not exists public.notification_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_type text not null,
  enabled boolean not null default true,
  primary key (user_id, notification_type)
);

-- ── Group polls ───────────────────────────────────────────────────────────────
create table if not exists public.group_polls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  question text not null,
  is_anonymous boolean not null default false,
  allow_multiple boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.group_polls (id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

create table if not exists public.poll_votes (
  poll_id uuid not null references public.group_polls (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, option_id, user_id)
);

-- poll message type
alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages
  add constraint messages_message_type_check
  check (message_type in ('text', 'voice', 'call_log', 'gift', 'poll'));

alter table public.messages
  add column if not exists poll_id uuid references public.group_polls (id) on delete set null;

-- ── Helpers ───────────────────────────────────────────────────────────────────
create or replace function public.is_user_blocked(viewer_id uuid, other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = viewer_id and blocked_id = other_id)
       or (blocker_id = other_id and blocked_id = viewer_id)
  );
$$;

create or replace function public.is_user_muted(muter_id uuid, muted_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_mutes
    where user_mutes.muter_id = muter_id and user_mutes.muted_id = muted_id
  );
$$;

create or replace function public.notification_type_enabled(p_user_id uuid, p_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select np.enabled from public.notification_preferences np
      where np.user_id = p_user_id and np.notification_type = p_type
    ),
    true
  );
$$;

create or replace function public.in_quiet_hours(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and p.quiet_hours_start is not null
      and p.quiet_hours_end is not null
      and (
        (p.quiet_hours_start <= p.quiet_hours_end
          and current_time between p.quiet_hours_start and p.quiet_hours_end)
        or (p.quiet_hours_start > p.quiet_hours_end
          and (current_time >= p.quiet_hours_start or current_time <= p.quiet_hours_end))
      )
  );
$$;

-- Respect blocks + notification prefs in create_notification
create or replace function public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_entity_type text,
  p_entity_id text,
  p_message text default null,
  p_skip_self boolean default true
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient_id is null then
    return;
  end if;

  if p_skip_self and p_actor_id is not null and p_recipient_id = p_actor_id then
    return;
  end if;

  if p_actor_id is not null and public.is_user_blocked(p_recipient_id, p_actor_id) then
    return;
  end if;

  if p_actor_id is not null and public.is_user_muted(p_recipient_id, p_actor_id) then
    return;
  end if;

  if not public.notification_type_enabled(p_recipient_id, p_type) then
    return;
  end if;

  if public.in_quiet_hours(p_recipient_id) then
    return;
  end if;

  insert into public.notifications (
    recipient_id, actor_id, type, entity_type, entity_id, message
  )
  values (
    p_recipient_id, p_actor_id, p_type, p_entity_type, p_entity_id, p_message
  );
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.user_blocks enable row level security;
alter table public.user_mutes enable row level security;
alter table public.content_reports enable row level security;
alter table public.account_appeals enable row level security;
alter table public.dm_requests enable row level security;
alter table public.chat_folders enable row level security;
alter table public.keyword_mutes enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.group_polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

drop policy if exists "Users manage own blocks" on public.user_blocks;
create policy "Users manage own blocks"
  on public.user_blocks for all to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

drop policy if exists "Users manage own mutes" on public.user_mutes;
create policy "Users manage own mutes"
  on public.user_mutes for all to authenticated
  using (muter_id = auth.uid())
  with check (muter_id = auth.uid());

drop policy if exists "Users create reports" on public.content_reports;
create policy "Users create reports"
  on public.content_reports for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "Users read own reports" on public.content_reports;
create policy "Users read own reports"
  on public.content_reports for select to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "Users manage own appeals" on public.account_appeals;
create policy "Users manage own appeals"
  on public.account_appeals for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "DM request participants" on public.dm_requests;
create policy "DM request participants"
  on public.dm_requests for all to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid())
  with check (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists "Users manage own chat folders" on public.chat_folders;
create policy "Users manage own chat folders"
  on public.chat_folders for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users manage own keyword mutes" on public.keyword_mutes;
create policy "Users manage own keyword mutes"
  on public.keyword_mutes for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users manage own notification prefs" on public.notification_preferences;
create policy "Users manage own notification prefs"
  on public.notification_preferences for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Polls visible to conversation members" on public.group_polls;
create policy "Polls visible to conversation members"
  on public.group_polls for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = group_polls.conversation_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Members create polls in groups" on public.group_polls;
create policy "Members create polls in groups"
  on public.group_polls for insert to authenticated
  with check (
    creator_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      join public.conversations c on c.id = cm.conversation_id
      where cm.conversation_id = group_polls.conversation_id
        and cm.user_id = auth.uid()
        and c.kind = 'group'
    )
  );

drop policy if exists "Poll options visible to members" on public.poll_options;
create policy "Poll options visible to members"
  on public.poll_options for select to authenticated
  using (
    exists (
      select 1 from public.group_polls gp
      join public.conversation_members cm on cm.conversation_id = gp.conversation_id
      where gp.id = poll_options.poll_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Poll creators add options" on public.poll_options;
create policy "Poll creators add options"
  on public.poll_options for insert to authenticated
  with check (
    exists (
      select 1 from public.group_polls gp
      where gp.id = poll_options.poll_id and gp.creator_id = auth.uid()
    )
  );

drop policy if exists "Members vote on polls" on public.poll_votes;
create policy "Members vote on polls"
  on public.poll_votes for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.group_polls gp
      join public.conversation_members cm on cm.conversation_id = gp.conversation_id
      where gp.id = poll_votes.poll_id and cm.user_id = auth.uid()
    )
  );

-- Blocked users cannot send messages (extends opportunities policy)
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
    and not exists (
      select 1 from public.conversation_members cm
      join public.conversation_members other on other.conversation_id = cm.conversation_id
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
        and other.user_id <> auth.uid()
        and public.is_user_blocked(auth.uid(), other.user_id)
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

-- ── Message & comment replies (same as replies-schema.sql) ───────────────────
alter table public.messages add column if not exists reply_to_id uuid;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'messages'
      and constraint_name = 'messages_reply_to_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_reply_to_id_fkey
      foreign key (reply_to_id) references public.messages (id) on delete set null;
  end if;
end $$;

alter table public.comments add column if not exists reply_to_id uuid;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'comments'
      and constraint_name = 'comments_reply_to_id_fkey'
  ) then
    alter table public.comments
      add constraint comments_reply_to_id_fkey
      foreign key (reply_to_id) references public.comments (id) on delete set null;
  end if;
end $$;

create index if not exists messages_reply_to_idx
  on public.messages (reply_to_id) where reply_to_id is not null;

create index if not exists comments_reply_to_idx
  on public.comments (reply_to_id) where reply_to_id is not null;

select
  exists (select 1 from information_schema.tables where table_name = 'user_blocks') as blocks_ok,
  exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'dm_policy') as privacy_ok,
  exists (select 1 from information_schema.tables where table_name = 'dm_requests') as requests_ok,
  exists (select 1 from information_schema.tables where table_name = 'group_polls') as polls_ok,
  exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'reply_to_id') as messages_reply_ok,
  exists (select 1 from information_schema.columns where table_name = 'comments' and column_name = 'reply_to_id') as comments_reply_ok;
