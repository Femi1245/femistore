-- Gifts — run after schema.sql + social-schema.sql + notifications-schema.sql
-- Payment provider (Stripe, Paystack, etc.) hooks in later via payment_* columns

-- ── Gift catalog ─────────────────────────────────────────────────────────────

create table if not exists public.gift_catalog (
  id text primary key,
  name text not null,
  emoji text not null,
  price_cents integer not null check (price_cents > 0),
  sort_order integer not null default 0
);

insert into public.gift_catalog (id, name, emoji, price_cents, sort_order) values
  ('rose', 'Rose', '🌹', 100, 1),
  ('coffee', 'Coffee', '☕', 300, 2),
  ('headphones', 'Headphones', '🎧', 500, 3),
  ('star', 'Star', '⭐', 1000, 4),
  ('trophy', 'Trophy', '🏆', 2500, 5),
  ('diamond', 'Diamond', '💎', 5000, 6)
on conflict (id) do update set
  name = excluded.name,
  emoji = excluded.emoji,
  price_cents = excluded.price_cents,
  sort_order = excluded.sort_order;

alter table public.gift_catalog enable row level security;

drop policy if exists "Authenticated users can read gift catalog" on public.gift_catalog;
create policy "Authenticated users can read gift catalog"
  on public.gift_catalog for select to authenticated
  using (true);

-- ── Sent gifts ──────────────────────────────────────────────────────────────

create table if not exists public.sent_gifts (
  id uuid primary key default gen_random_uuid(),
  catalog_id text not null references public.gift_catalog (id),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  context text not null check (context in ('profile', 'chat', 'live')),
  conversation_id uuid references public.conversations (id) on delete set null,
  room_name text,
  note text not null default '' check (char_length(note) <= 200),
  amount_cents integer not null check (amount_cents > 0),
  payment_status text not null default 'mock'
    check (payment_status in ('pending', 'mock', 'paid', 'failed')),
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now()
);

create index if not exists sent_gifts_recipient_idx
  on public.sent_gifts (recipient_id, created_at desc);

create index if not exists sent_gifts_live_room_idx
  on public.sent_gifts (room_name, created_at desc)
  where context = 'live';

alter table public.sent_gifts enable row level security;

drop policy if exists "Users can view relevant gifts" on public.sent_gifts;
create policy "Users can view relevant gifts"
  on public.sent_gifts for select to authenticated
  using (
    sender_id = auth.uid()
    or recipient_id = auth.uid()
    or context = 'live'
  );

drop policy if exists "Users can send gifts" on public.sent_gifts;
create policy "Users can send gifts"
  on public.sent_gifts for insert to authenticated
  with check (sender_id = auth.uid());

-- ── Gift messages in chat ─────────────────────────────────────────────────────

alter table public.messages
  drop constraint if exists messages_message_type_check;

alter table public.messages
  add constraint messages_message_type_check
  check (message_type in ('text', 'voice', 'call_log', 'gift'));

alter table public.messages
  add column if not exists sent_gift_id uuid references public.sent_gifts (id) on delete set null;

-- ── Notifications: gift type ────────────────────────────────────────────────

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check
  check (type in (
    'follow', 'like', 'comment', 'reshare', 'new_post', 'new_status',
    'message', 'live_started', 'live_ended', 'gift'
  ));

-- ── Realtime for live gift animations ─────────────────────────────────────────

do $$
begin
  alter publication supabase_realtime add table public.sent_gifts;
exception when duplicate_object then null;
end $$;
