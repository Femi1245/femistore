-- Message delete/hide for chat action sheet
-- Run in Supabase SQL Editor

alter table public.messages
  add column if not exists deleted_at timestamptz;

create table if not exists public.hidden_messages (
  user_id uuid not null references public.profiles (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

create index if not exists hidden_messages_user_idx
  on public.hidden_messages (user_id, message_id);

alter table public.hidden_messages enable row level security;

drop policy if exists "Users can view own hidden messages" on public.hidden_messages;
create policy "Users can view own hidden messages"
  on public.hidden_messages for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can hide messages for self" on public.hidden_messages;
create policy "Users can hide messages for self"
  on public.hidden_messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      join public.conversation_members cm on cm.conversation_id = m.conversation_id
      where m.id = message_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can unhide own hidden messages" on public.hidden_messages;
create policy "Users can unhide own hidden messages"
  on public.hidden_messages for delete to authenticated
  using (user_id = auth.uid());

-- Allow sender to soft-delete own text messages (delete for everyone)
drop policy if exists "Users can delete own messages for everyone" on public.messages;
create policy "Users can delete own messages for everyone"
  on public.messages for update to authenticated
  using (
    sender_id = auth.uid()
    and coalesce(message_type, 'text') = 'text'
    and deleted_at is null
    and created_at > now() - interval '60 minutes'
  )
  with check (sender_id = auth.uid());
