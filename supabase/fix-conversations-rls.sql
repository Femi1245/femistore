-- Fix: "new row violates row-level security policy for table conversations"
-- Run this in the Supabase SQL Editor.
-- Recreates the insert policy so logged-in users can start conversations.

alter table public.conversations enable row level security;

drop policy if exists "Authenticated users can create conversations" on public.conversations;
create policy "Authenticated users can create conversations"
  on public.conversations for insert to authenticated
  with check (created_by = auth.uid() or created_by is null);

-- Make sure members can be added to the new conversation
alter table public.conversation_members enable row level security;

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

-- Members can see conversations they belong to (and ones they just created)
drop policy if exists "Members can view conversations" on public.conversations;
create policy "Members can view conversations"
  on public.conversations for select to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = id and cm.user_id = auth.uid()
    )
    or (kind = 'channel' and is_public = true)
  );
