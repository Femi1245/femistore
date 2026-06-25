-- Business auto-reply: schedule, limits, and message tracking
-- Run after seller-inbox-chat-settings.sql

alter table public.profiles
  add column if not exists business_auto_reply_mode text not null default 'template'
    check (business_auto_reply_mode in ('template', 'ai'));

alter table public.profiles
  add column if not exists business_auto_reply_max_count integer not null default 1
    check (business_auto_reply_max_count >= 1 and business_auto_reply_max_count <= 20);

alter table public.profiles
  add column if not exists business_auto_reply_hours_start time;

alter table public.profiles
  add column if not exists business_auto_reply_hours_end time;

alter table public.messages
  add column if not exists is_auto_reply boolean not null default false;

create index if not exists messages_auto_reply_idx
  on public.messages (conversation_id, sender_id)
  where is_auto_reply = true;
