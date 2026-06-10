-- Voice/video calls + voicemail — run after phone-groups-channels-schema.sql

-- ── Call sessions (1:1, group; uses LiveKit rooms) ──────────────────────────

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  room_name text unique not null,
  call_type text not null check (call_type in ('audio', 'video')),
  status text not null default 'ringing'
    check (status in ('ringing', 'active', 'ended', 'missed', 'declined')),
  initiator_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists call_sessions_conversation_idx
  on public.call_sessions (conversation_id, created_at desc);

create index if not exists call_sessions_status_idx
  on public.call_sessions (status, created_at desc);

alter table public.call_sessions enable row level security;

create or replace function public.is_conversation_member(conv_id uuid, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conv_id and cm.user_id = user_id
  );
$$;

drop policy if exists "Members can view call sessions" on public.call_sessions;
create policy "Members can view call sessions"
  on public.call_sessions for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "Members can start calls" on public.call_sessions;
create policy "Members can start calls"
  on public.call_sessions for insert to authenticated
  with check (
    initiator_id = auth.uid()
    and public.is_conversation_member(conversation_id, auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.kind in ('dm', 'group')
    )
  );

drop policy if exists "Members can update call sessions" on public.call_sessions;
create policy "Members can update call sessions"
  on public.call_sessions for update to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));

-- ── Voice messages in chat ──────────────────────────────────────────────────

alter table public.messages
  add column if not exists message_type text not null default 'text'
    check (message_type in ('text', 'voice', 'call_log')),
  add column if not exists media_url text,
  add column if not exists media_duration_seconds integer;

-- ── Voice message storage ───────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('voice-messages', 'voice-messages', true)
on conflict (id) do update set public = true;

drop policy if exists "Voice messages are publicly accessible" on storage.objects;
create policy "Voice messages are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'voice-messages');

drop policy if exists "Users can upload voice messages" on storage.objects;
create policy "Users can upload voice messages"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'voice-messages'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own voice messages" on storage.objects;
create policy "Users can delete own voice messages"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'voice-messages'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Realtime for incoming calls ─────────────────────────────────────────────

do $$
begin
  alter publication supabase_realtime add table public.call_sessions;
exception when duplicate_object then null;
end $$;
