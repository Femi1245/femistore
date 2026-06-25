-- Connection requests + DM partner RLS fix
-- Run in Supabase SQL Editor after social-schema.sql + messaging-friends-schema.sql

-- ── 1. Fix: add the other person to a new DM (RLS blocked partner insert) ─────

create or replace function public.add_dm_conversation_partner(
  p_conversation_id uuid,
  p_partner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and c.kind = 'dm'
  ) then
    raise exception 'Not a DM conversation';
  end if;

  if not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You are not in this conversation';
  end if;

  if p_partner_id = auth.uid() then
    raise exception 'Cannot add yourself';
  end if;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (p_conversation_id, p_partner_id, 'member')
  on conflict (conversation_id, user_id) do nothing;
end;
$$;

revoke all on function public.add_dm_conversation_partner(uuid, uuid) from public;
grant execute on function public.add_dm_conversation_partner(uuid, uuid) to authenticated;

-- Belt-and-suspenders: allow conversation creator to add DM partner via RLS
drop policy if exists "Users can join conversations" on public.conversation_members;
create policy "Users can join conversations"
  on public.conversation_members for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id
        and cm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.kind = 'dm'
        and c.created_by = auth.uid()
        and exists (
          select 1
          from public.conversation_members cm
          where cm.conversation_id = c.id
            and cm.user_id = auth.uid()
        )
    )
  );

-- ── 2. Connection requests (Connect → Accept → friends) ─────────────────────

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create index if not exists connection_requests_recipient_idx
  on public.connection_requests (to_user_id, status, created_at desc);

alter table public.connection_requests enable row level security;

drop policy if exists "Connection request participants read" on public.connection_requests;
create policy "Connection request participants read"
  on public.connection_requests for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists "Users send connection requests" on public.connection_requests;
create policy "Users send connection requests"
  on public.connection_requests for insert to authenticated
  with check (from_user_id = auth.uid());

drop policy if exists "Recipients respond to connection requests" on public.connection_requests;
create policy "Recipients respond to connection requests"
  on public.connection_requests for update to authenticated
  using (to_user_id = auth.uid())
  with check (to_user_id = auth.uid());

create or replace function public.accept_connection_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from uuid;
  v_to uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select from_user_id, to_user_id
  into v_from, v_to
  from public.connection_requests
  where id = p_request_id
    and to_user_id = auth.uid()
    and status = 'pending';

  if v_from is null then
    raise exception 'Request not found';
  end if;

  update public.connection_requests
  set status = 'accepted'
  where id = p_request_id;

  insert into public.follows (follower_id, following_id)
  values (v_from, v_to)
  on conflict do nothing;

  insert into public.follows (follower_id, following_id)
  values (v_to, v_from)
  on conflict do nothing;
end;
$$;

revoke all on function public.accept_connection_request(uuid) from public;
grant execute on function public.accept_connection_request(uuid) to authenticated;

create or replace function public.notify_on_connection_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_notification(
    new.to_user_id,
    new.from_user_id,
    'connection_request',
    'connection_request',
    new.id::text,
    'wants to connect with you'
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_connection_request on public.connection_requests;
create trigger trg_notify_connection_request
  after insert on public.connection_requests
  for each row
  when (new.status = 'pending')
  execute function public.notify_on_connection_request();

-- ── 3. Notifications: connection_request type ───────────────────────────────

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check
  check (type in (
    'follow', 'like', 'comment', 'reshare', 'new_post', 'new_status',
    'message', 'live_started', 'live_ended', 'gift', 'connection_request'
  ));

-- ── 4. DMs: allow message requests before mutual friends ────────────────────

create or replace function public.can_send_dm_message(conv_id uuid, sender_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = conv_id
        and cm.user_id <> sender_id
        and public.are_mutual_friends(sender_id, cm.user_id)
    )
    or exists (
      select 1
      from public.dm_requests dr
      where dr.conversation_id = conv_id
        and dr.status = 'pending'
        and dr.from_user_id = sender_id
    )
    or exists (
      select 1
      from public.dm_requests dr
      where dr.conversation_id = conv_id
        and dr.status = 'accepted'
        and (dr.from_user_id = sender_id or dr.to_user_id = sender_id)
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
        and public.can_send_dm_message(messages.conversation_id, auth.uid())
      )
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.connection_requests;
exception when duplicate_object then null;
end $$;
