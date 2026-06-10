-- Phone verification, groups, and channels — run after schema.sql + messaging-friends-schema.sql

-- ── Profiles: verified phone for contact discovery ──────────────────────────

alter table public.profiles
  add column if not exists phone_e164 text,
  add column if not exists phone_verified_at timestamptz;

create unique index if not exists profiles_phone_e164_unique_idx
  on public.profiles (phone_e164)
  where phone_e164 is not null;

-- ── Conversations: DM, group, or channel ────────────────────────────────────

alter table public.conversations
  add column if not exists kind text not null default 'dm'
    check (kind in ('dm', 'group', 'channel')),
  add column if not exists name text,
  add column if not exists description text not null default '',
  add column if not exists avatar_url text,
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists is_public boolean not null default false;

alter table public.conversation_members
  add column if not exists role text not null default 'member'
    check (role in ('owner', 'admin', 'member'));

-- ── Phone helpers ───────────────────────────────────────────────────────────

create or replace function public.normalize_phone_e164(raw_phone text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
begin
  if raw_phone is null or trim(raw_phone) = '' then
    return null;
  end if;

  digits := regexp_replace(trim(raw_phone), '[^0-9+]', '', 'g');
  if digits !~ '^\+' then
    digits := '+' || regexp_replace(digits, '^\+', '');
  end if;

  if length(regexp_replace(digits, '[^0-9]', '', 'g')) < 8 then
    return null;
  end if;

  return digits;
end;
$$;

create or replace function public.sync_my_verified_phone()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  verified_phone text;
  confirmed_at timestamptz;
begin
  select phone, phone_confirmed_at
  into verified_phone, confirmed_at
  from auth.users
  where id = auth.uid();

  if verified_phone is not null and confirmed_at is not null then
    update public.profiles
    set phone_e164 = public.normalize_phone_e164(verified_phone),
        phone_verified_at = confirmed_at
    where id = auth.uid();
  end if;
end;
$$;

grant execute on function public.sync_my_verified_phone() to authenticated;

create or replace function public.find_user_by_phone(search_phone text)
returns table (
  id uuid,
  username text,
  display_name text,
  country text,
  avatar_url text,
  phone_verified_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
begin
  normalized := public.normalize_phone_e164(search_phone);
  if normalized is null then
    return;
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.phone_verified_at is not null
  ) then
    raise exception 'Verify your phone number first';
  end if;

  return query
  select p.id, p.username, p.display_name, p.country, p.avatar_url, p.phone_verified_at
  from public.profiles p
  where p.phone_e164 = normalized
    and p.phone_verified_at is not null
    and p.id <> auth.uid();
end;
$$;

grant execute on function public.find_user_by_phone(text) to authenticated;

-- ── Conversation helpers ────────────────────────────────────────────────────

create or replace function public.is_conversation_admin(conv_id uuid, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conv_id
      and cm.user_id = user_id
      and cm.role in ('owner', 'admin')
  );
$$;

-- ── RLS: conversation members (groups/channels) ─────────────────────────────

drop policy if exists "Users can join conversations" on public.conversation_members;

create policy "Users can join conversations"
  on public.conversation_members for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id
        and cm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.conversation_members cm
      join public.conversations c on c.id = cm.conversation_id
      where cm.conversation_id = conversation_members.conversation_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
        and c.kind in ('group', 'channel')
    )
  );

drop policy if exists "Admins can update membership" on public.conversation_members;
create policy "Admins can update membership"
  on public.conversation_members for update to authenticated
  using (public.is_conversation_admin(conversation_id, auth.uid()));

drop policy if exists "Admins can remove members" on public.conversation_members;
create policy "Admins can remove members"
  on public.conversation_members for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_conversation_admin(conversation_id, auth.uid())
  );

-- ── RLS: conversations update (rename group/channel) ──────────────────────

drop policy if exists "Admins can update conversations" on public.conversations;
create policy "Admins can update conversations"
  on public.conversations for update to authenticated
  using (
    kind = 'dm'
    or public.is_conversation_admin(id, auth.uid())
  );

-- ── RLS: messages (DM friends / group all / channel admins only) ─────────────

drop policy if exists "Friends can send messages" on public.messages;
drop policy if exists "Members can send messages" on public.messages;
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
            and not public.are_mutual_friends(auth.uid(), cm.user_id)
        )
      )
    )
  );
