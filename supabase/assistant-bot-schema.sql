-- Zumelia AI assistant — run after messaging-friends-schema.sql
-- Allows every user to DM the @zumelia-ai assistant without mutual follow.
-- The assistant profile is created by supabase/seed-zumelia-ai.sql (recommended)
-- or automatically on first API use when SUPABASE_SERVICE_ROLE_KEY is set on the server.

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

-- Let users add the assistant to a conversation (DM setup)
drop policy if exists "Users can join conversations" on public.conversation_members;
create policy "Users can join conversations"
  on public.conversation_members for insert to authenticated
  with check (
    user_id = auth.uid()
    or user_id = public.zumelia_assistant_id()
  );

-- DMs with the assistant skip mutual-friend requirement
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
            and not public.is_zumelia_assistant(cm.user_id)
            and not public.are_mutual_friends(auth.uid(), cm.user_id)
        )
      )
    )
  );
