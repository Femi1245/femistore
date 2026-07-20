-- Read receipts: let conversation members see co-members' read cursors
-- when show_read_receipts is enabled on their profile.
-- Run after trust-safety-schema.sql

create or replace function public.get_conversation_read_cursors(p_conversation_id uuid)
returns table (
  user_id uuid,
  last_read_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select cms.user_id, cms.last_read_at
  from public.conversation_member_settings cms
  join public.profiles p on p.id = cms.user_id
  where cms.conversation_id = p_conversation_id
    and cms.user_id <> auth.uid()
    and cms.last_read_at is not null
    and coalesce(p.show_read_receipts, true) = true
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = p_conversation_id
        and cm.user_id = auth.uid()
    );
$$;

revoke all on function public.get_conversation_read_cursors(uuid) from public;
grant execute on function public.get_conversation_read_cursors(uuid) to authenticated;
