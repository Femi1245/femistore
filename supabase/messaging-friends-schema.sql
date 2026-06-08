-- Messaging fixes — run in Supabase SQL Editor (after schema.sql + social-schema.sql)
-- 1. Allow adding the other person to a DM conversation
-- 2. Require mutual follow (both connected) before sending messages

-- Fix: adding conversation partner failed because only auth.uid() could be inserted
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
  );

create or replace function public.are_mutual_friends(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.follows a
    join public.follows b
      on a.follower_id = b.following_id
     and a.following_id = b.follower_id
    where a.follower_id = user_a
      and a.following_id = user_b
  );
$$;

drop policy if exists "Members can send messages" on public.messages;
create policy "Friends can send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id <> auth.uid()
        and public.are_mutual_friends(auth.uid(), cm.user_id)
    )
  );
