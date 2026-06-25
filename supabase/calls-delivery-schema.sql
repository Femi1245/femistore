-- Call delivery tracking — run after calls-voicemail-schema.sql
-- Tracks when the callee's device receives the ring signal.

alter table public.call_sessions
  add column if not exists recipient_id uuid references public.profiles (id) on delete set null,
  add column if not exists delivered_at timestamptz;

create index if not exists call_sessions_recipient_idx
  on public.call_sessions (recipient_id, status, created_at desc);
