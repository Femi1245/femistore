-- Secret chats — run after phone-groups-channels-schema.sql
-- Private DMs hidden from the main chat list; optional self-destructing messages

alter table public.conversations
  add column if not exists is_secret boolean not null default false;

create index if not exists conversations_secret_idx
  on public.conversations (is_secret)
  where is_secret = true;

alter table public.messages
  add column if not exists expires_at timestamptz;

create index if not exists messages_expires_idx
  on public.messages (expires_at)
  where expires_at is not null;
