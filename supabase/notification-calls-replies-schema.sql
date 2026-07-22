-- Expand notifications for calls + comment replies.
-- Also grant RPC so authenticated call APIs can create notifications.

-- 1) Expand allowed notification types
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'follow',
      'like',
      'comment',
      'reshare',
      'new_post',
      'new_status',
      'message',
      'live_started',
      'live_ended',
      'gift',
      'connection_request',
      'call',
      'missed_call'
    )
  );

-- 2) Allow authenticated/service role to call the helper (still security definer)
grant execute on function public.create_notification(uuid, uuid, text, text, text, text, boolean)
  to authenticated, service_role;

-- 3) Comment replies: notify post owner AND parent comment author
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_parent_author uuid;
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

  if new.reply_to_id is not null then
    select user_id into v_parent_author
    from public.comments
    where id = new.reply_to_id;

    if v_parent_author is not null
       and v_parent_author is distinct from v_owner
       and v_parent_author is distinct from new.user_id then
      perform public.create_notification(
        v_parent_author,
        new.user_id,
        'comment',
        'post',
        new.post_id::text,
        left('Replied: ' || new.content, 120)
      );
    end if;
  end if;

  return new;
end;
$$;

-- 4) Incoming / missed call helpers used by API (and optional triggers)
create or replace function public.notify_incoming_call(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_session_id uuid,
  p_call_type text,
  p_conversation_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_notification(
    p_recipient_id,
    p_actor_id,
    'call',
    'call',
    p_session_id::text,
    case
      when p_call_type = 'video' then 'Incoming video call'
      else 'Incoming voice call'
    end
  );
end;
$$;

create or replace function public.notify_missed_call(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_session_id uuid,
  p_call_type text,
  p_conversation_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_notification(
    p_recipient_id,
    p_actor_id,
    'missed_call',
    'call',
    coalesce(p_conversation_id::text, p_session_id::text),
    case
      when p_call_type = 'video' then 'Missed video call'
      else 'Missed voice call'
    end
  );
end;
$$;

grant execute on function public.notify_incoming_call(uuid, uuid, uuid, text, uuid)
  to authenticated, service_role;
grant execute on function public.notify_missed_call(uuid, uuid, uuid, text, uuid)
  to authenticated, service_role;
