-- Separate business-inquiry DMs from personal DMs (same pattern as secret chats)
-- Run after seller-inbox-chat-settings.sql

alter table public.conversations
  add column if not exists dm_context text not null default 'personal'
    check (dm_context in ('personal', 'business'));

create index if not exists conversations_dm_context_idx
  on public.conversations (dm_context)
  where kind = 'dm' and dm_context = 'business';
