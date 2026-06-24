-- Fix: hosts could not invite friends (RLS only allowed user_id = auth.uid() on insert).
-- Run in Supabase SQL Editor if you already applied live-stage-schema.sql before this fix.

drop policy if exists "Users create own join requests" on public.live_stream_join_requests;
create policy "Users create own join requests"
  on public.live_stream_join_requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and request_type = 'request'
  );

drop policy if exists "Hosts send live stage invites" on public.live_stream_join_requests;
create policy "Hosts send live stage invites"
  on public.live_stream_join_requests for insert
  to authenticated
  with check (
    request_type = 'invite'
    and user_id is distinct from auth.uid()
    and exists (
      select 1 from public.live_streams ls
      where ls.room_name = live_stream_join_requests.room_name
        and ls.host_id = auth.uid()
        and ls.is_live = true
    )
  );
