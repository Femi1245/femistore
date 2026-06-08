-- Notifications — run in Supabase SQL Editor (after schema.sql + social-schema.sql + live-schema.sql + status-schema.sql)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null check (
    type in (
      'follow',
      'like',
      'comment',
      'reshare',
      'new_post',
      'new_status',
      'message',
      'live_started',
      'live_ended'
    )
  ),
  entity_type text not null,
  entity_id text not null,
  message text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());

drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Helper: insert notification (security definer, used by triggers)
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

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    entity_type,
    entity_id,
    message
  )
  values (
    p_recipient_id,
    p_actor_id,
    p_type,
    p_entity_type,
    p_entity_id,
    p_message
  );
end;
$$;

-- New follower
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_notification(
    new.following_id,
    new.follower_id,
    'follow',
    'profile',
    new.follower_id::text
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- Post like
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  perform public.create_notification(
    v_owner,
    new.user_id,
    'like',
    'post',
    new.post_id::text
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_like on public.post_likes;
create trigger trg_notify_like
  after insert on public.post_likes
  for each row execute function public.notify_on_like();

-- Comment
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  perform public.create_notification(
    v_owner,
    new.user_id,
    'comment',
    'post',
    new.post_id::text,
    left(new.content, 120)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- Reshare
create or replace function public.notify_on_reshare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  perform public.create_notification(
    v_owner,
    new.user_id,
    'reshare',
    'post',
    new.post_id::text
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_reshare on public.post_reshares;
create trigger trg_notify_reshare
  after insert on public.post_reshares
  for each row execute function public.notify_on_reshare();

-- New post from someone you follow (original posts only, not reshares)
create or replace function public.notify_on_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_follower record;
begin
  if new.reshare_of is not null then
    return new;
  end if;

  for v_follower in
    select follower_id from public.follows where following_id = new.user_id
  loop
    perform public.create_notification(
      v_follower.follower_id,
      new.user_id,
      'new_post',
      'post',
      new.id::text,
      left(nullif(trim(new.content), ''), 120)
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_new_post on public.posts;
create trigger trg_notify_new_post
  after insert on public.posts
  for each row execute function public.notify_on_new_post();

-- New status from someone you follow (requires status-schema.sql)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'status_updates'
  ) then
    create or replace function public.notify_on_new_status()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    declare
      v_follower record;
    begin
      for v_follower in
        select follower_id from public.follows where following_id = new.user_id
      loop
        perform public.create_notification(
          v_follower.follower_id,
          new.user_id,
          'new_status',
          'status',
          new.id::text,
          left(nullif(trim(new.content), ''), 120)
        );
      end loop;
      return new;
    end;
    $fn$;

    drop trigger if exists trg_notify_new_status on public.status_updates;
    create trigger trg_notify_new_status
      after insert on public.status_updates
      for each row execute function public.notify_on_new_status();
  end if;
end $$;

-- Direct message
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
begin
  for v_member in
    select user_id
    from public.conversation_members
    where conversation_id = new.conversation_id
      and user_id <> new.sender_id
  loop
    perform public.create_notification(
      v_member.user_id,
      new.sender_id,
      'message',
      'conversation',
      new.conversation_id::text,
      left(new.content, 120)
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- Live stream started — notify followers
create or replace function public.notify_on_live_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_follower record;
begin
  if not new.is_live then
    return new;
  end if;

  for v_follower in
    select follower_id from public.follows where following_id = new.host_id
  loop
    perform public.create_notification(
      v_follower.follower_id,
      new.host_id,
      'live_started',
      'live_stream',
      new.room_name,
      new.title
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_live_started on public.live_streams;
create trigger trg_notify_live_started
  after insert on public.live_streams
  for each row execute function public.notify_on_live_started();

-- Live stream ended — notify host (confirmation) + followers
create or replace function public.notify_on_live_ended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_follower record;
begin
  if old.is_live and not new.is_live then
    perform public.create_notification(
      new.host_id,
      null,
      'live_ended',
      'live_stream',
      new.room_name,
      'Your live stream "' || new.title || '" has ended.',
      false
    );

    for v_follower in
      select follower_id from public.follows where following_id = new.host_id
    loop
      perform public.create_notification(
        v_follower.follower_id,
        new.host_id,
        'live_ended',
        'live_stream',
        new.room_name,
        new.title
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_live_ended on public.live_streams;
create trigger trg_notify_live_ended
  after update on public.live_streams
  for each row execute function public.notify_on_live_ended();

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
