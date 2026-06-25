-- Repair gig inquiry inbox routing (buyer = personal, seller = business)
-- Run after business-dm-separate-threads.sql

update public.conversation_member_settings cms
set inbox = 'personal'
from public.conversations c
where c.id = cms.conversation_id
  and c.kind = 'dm'
  and c.dm_context = 'business'
  and c.created_by = cms.user_id;

update public.conversation_member_settings cms
set inbox = 'business'
from public.conversations c
where c.id = cms.conversation_id
  and c.kind = 'dm'
  and c.dm_context = 'business'
  and c.created_by is not null
  and c.created_by <> cms.user_id;
