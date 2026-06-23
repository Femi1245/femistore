-- Voice lounges, close friends, vibe prompts, pay-in-chat
-- Run AFTER schema.sql + social-schema.sql + messaging-friends-schema.sql

-- ── Voice rooms (audio lounges via LiveKit) ─────────────────────────────────
create table if not exists public.voice_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  topic text not null default '',
  room_name text unique not null,
  is_active boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists voice_rooms_active_idx
  on public.voice_rooms (is_active, started_at desc);

alter table public.voice_rooms enable row level security;

drop policy if exists "Authenticated users can view voice rooms" on public.voice_rooms;
create policy "Authenticated users can view voice rooms"
  on public.voice_rooms for select to authenticated using (true);

drop policy if exists "Hosts can create voice rooms" on public.voice_rooms;
create policy "Hosts can create voice rooms"
  on public.voice_rooms for insert to authenticated
  with check (host_id = auth.uid());

drop policy if exists "Hosts can update own voice rooms" on public.voice_rooms;
create policy "Hosts can update own voice rooms"
  on public.voice_rooms for update to authenticated
  using (host_id = auth.uid());

-- ── Close friends ───────────────────────────────────────────────────────────
create table if not exists public.close_friends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create index if not exists close_friends_friend_idx on public.close_friends (friend_id);

alter table public.close_friends enable row level security;

drop policy if exists "Users manage own close friends" on public.close_friends;
create policy "Users manage own close friends"
  on public.close_friends for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can see who marked them close" on public.close_friends;
create policy "Users can see who marked them close"
  on public.close_friends for select to authenticated
  using (friend_id = auth.uid());

-- ── Daily vibe responses ────────────────────────────────────────────────────
create table if not exists public.vibe_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt_key text not null,
  prompt_text text not null,
  response text not null check (char_length(trim(response)) between 1 and 280),
  created_at timestamptz not null default now(),
  unique (user_id, prompt_key)
);

create index if not exists vibe_responses_prompt_idx
  on public.vibe_responses (prompt_key, created_at desc);

alter table public.vibe_responses enable row level security;

drop policy if exists "Anyone authenticated can read vibe responses" on public.vibe_responses;
create policy "Anyone authenticated can read vibe responses"
  on public.vibe_responses for select to authenticated using (true);

drop policy if exists "Users post own vibe response" on public.vibe_responses;
create policy "Users post own vibe response"
  on public.vibe_responses for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users update own vibe response" on public.vibe_responses;
create policy "Users update own vibe response"
  on public.vibe_responses for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Pay in chat ─────────────────────────────────────────────────────────────
create table if not exists public.chat_payments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD',
  note text not null default '',
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'mock', 'failed')),
  payment_provider text,
  payment_reference text,
  message_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists chat_payments_conversation_idx
  on public.chat_payments (conversation_id, created_at desc);

alter table public.chat_payments enable row level security;

drop policy if exists "Conversation members view chat payments" on public.chat_payments;
create policy "Conversation members view chat payments"
  on public.chat_payments for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = chat_payments.conversation_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Senders create chat payments" on public.chat_payments;
create policy "Senders create chat payments"
  on public.chat_payments for insert to authenticated
  with check (sender_id = auth.uid());

alter table public.messages
  add column if not exists chat_payment_id uuid references public.chat_payments (id) on delete set null;

alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages
  add constraint messages_message_type_check
  check (message_type in ('text', 'voice', 'call_log', 'gift', 'poll', 'payment'));
