-- ═══════════════════════════════════════════════════════════════════════════
-- Zumelia replies — SAFE TO RE-RUN
-- Run in Supabase SQL Editor (fixes messages.reply_to_id + comments.reply_to_id)
--
-- Prerequisites: schema.sql, social-schema.sql (comments table), messaging schemas
-- ═══════════════════════════════════════════════════════════════════════════

-- ── messages.reply_to_id ──────────────────────────────────────────────────────
alter table public.messages
  add column if not exists reply_to_id uuid;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'messages'
      and constraint_name = 'messages_reply_to_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_reply_to_id_fkey
      foreign key (reply_to_id) references public.messages (id) on delete set null;
  end if;
exception when others then
  raise notice 'messages_reply_to_id_fkey: %', sqlerrm;
end $$;

-- ── comments.reply_to_id ──────────────────────────────────────────────────────
alter table public.comments
  add column if not exists reply_to_id uuid;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'comments'
      and constraint_name = 'comments_reply_to_id_fkey'
  ) then
    alter table public.comments
      add constraint comments_reply_to_id_fkey
      foreign key (reply_to_id) references public.comments (id) on delete set null;
  end if;
exception when others then
  raise notice 'comments_reply_to_id_fkey: %', sqlerrm;
end $$;

create index if not exists messages_reply_to_idx
  on public.messages (reply_to_id)
  where reply_to_id is not null;

create index if not exists comments_reply_to_idx
  on public.comments (reply_to_id)
  where reply_to_id is not null;

-- ── Confirmation (both should be true) ─────────────────────────────────────────
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'reply_to_id'
  ) as messages_reply_to_id_ok,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comments' and column_name = 'reply_to_id'
  ) as comments_reply_to_id_ok;
