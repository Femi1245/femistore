-- Live stream chat — run in Supabase SQL Editor (after live-schema.sql)

create table if not exists public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_name text not null references public.live_streams (room_name) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists live_chat_room_created_idx
  on public.live_chat_messages (room_name, created_at);

alter table public.live_chat_messages enable row level security;

drop policy if exists "Authenticated users can read live chat" on public.live_chat_messages;
create policy "Authenticated users can read live chat"
  on public.live_chat_messages for select to authenticated
  using (true);

drop policy if exists "Users can post in live chat when stream is live" on public.live_chat_messages;
create policy "Users can post in live chat when stream is live"
  on public.live_chat_messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.live_streams ls
      where ls.room_name = live_chat_messages.room_name
        and ls.is_live = true
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.live_chat_messages;
exception when duplicate_object then null;
end $$;
