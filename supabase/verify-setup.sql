-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Zumelia — Database setup verification                                     ║
-- ║                                                                           ║
-- ║  Run this WHOLE file in the Supabase SQL Editor.                           ║
-- ║  It reports every table / column / function / policy / bucket the app      ║
-- ║  needs, and flags anything MISSING. Rows that are not "OK" sort to the     ║
-- ║  top so you can see problems immediately.                                  ║
-- ║                                                                           ║
-- ║  Fix MISSING items by running the matching file in supabase/ in order:     ║
-- ║    1. schema.sql                                                           ║
-- ║    2. social-schema.sql                                                    ║
-- ║    3. messaging-friends-schema.sql                                         ║
-- ║    4. notifications-schema.sql                                             ║
-- ║    5. status-schema.sql                                                    ║
-- ║    6. live-schema.sql  +  live-chat-schema.sql                             ║
-- ║    7. watch-schema.sql                                                     ║
-- ║    8. phone-groups-channels-schema.sql                                     ║
-- ║    9. calls-voicemail-schema.sql                                           ║
-- ║   10. secret-chat-schema.sql                                               ║
-- ║   11. gifts-schema.sql   (run AFTER calls-voicemail-schema.sql)            ║
-- ║   12. edit-presence-themes-schema.sql                                      ║
-- ║   13. business-accounts-schema.sql                                         ║
-- ║   14. assistant-bot-schema.sql (after messaging / phone-groups schemas)    ║
-- ║   15. seed-zumelia-ai.sql (creates @zumelia-ai profile — run once)       ║
-- ║   16. live-stage-schema.sql (viewers, join requests, co-hosts)         ║
-- ║   17. opportunities-schema.sql                                           ║
-- ║   17. trust-safety-schema.sql                                            ║
-- ║   18. replies-schema.sql                                               ║
-- ║   19. email-notifications-schema.sql (transactional email log)       ║
-- ║   20. email-automation-schema.sql (welcome + re-engagement types)    ║
-- ║   20. business-posts-schema.sql (personal vs business posts)         ║
-- ║   21. opportunities-board-schema.sql (jobs / gigs board)             ║
-- ║   22. voice-close-friends-payments-schema.sql                        ║
-- ║   23. opportunities-service-gigs-schema.sql (list products/services) ║
-- ║   24. post-analytics-schema.sql (post views / owner insights)        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

drop table if exists __zumelia_diag;
create temp table __zumelia_diag (area text, item text, status text);

-- ── Tables ──────────────────────────────────────────────────────────────────
insert into __zumelia_diag
select 'table', t,
  case when to_regclass('public.' || t) is not null then 'OK' else 'MISSING' end
from unnest(array[
  'profiles','conversations','conversation_members','messages',
  'follows','posts','post_likes','comments','post_reshares','post_views',
  'notifications','status_updates','status_views',
  'live_streams','live_chat_messages','live_stream_viewers','live_stream_join_requests','live_stream_guests',
  'watch_history','playlists','playlist_items','user_videos',
  'gift_catalog','sent_gifts','call_sessions','conversation_member_settings',
  'user_blocks','user_mutes','content_reports','account_appeals','dm_requests',
  'chat_folders','keyword_mutes','notification_preferences','group_polls',
  'email_notification_log','opportunities',
  'voice_rooms','close_friends','vibe_responses','chat_payments'
]) as t;

-- ── Columns added by feature migrations ──────────────────────────────────────
insert into __zumelia_diag
select 'column', c.tbl || '.' || c.col,
  case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = c.tbl and column_name = c.col
    ) then 'OK'
    when c.tbl = 'conversation_member_settings'
      and c.col in ('is_pinned', 'translation_enabled')
      then 'MISSING (run supabase/opportunities-schema.sql)'
    when c.tbl = 'profiles'
      and c.col in ('business_contact_enabled', 'business_auto_reply_enabled', 'business_featured')
      then 'MISSING (run supabase/opportunities-schema.sql)'
    when c.tbl = 'profiles'
      and c.col in ('is_private', 'dm_policy', 'ai_assistant_enabled', 'profile_theme')
      then 'MISSING (run supabase/trust-safety-schema.sql)'
    when c.tbl = 'conversation_member_settings'
      and c.col in ('notifications_muted', 'last_read_at', 'folder_id')
      then 'MISSING (run supabase/trust-safety-schema.sql)'
    when c.tbl = 'messages' and c.col = 'reply_to_id'
      then 'MISSING (run supabase/replies-schema.sql)'
    when c.tbl = 'comments' and c.col = 'reply_to_id'
      then 'MISSING (run supabase/replies-schema.sql)'
    when c.tbl = 'opportunities'
      and c.col in ('listing_kind', 'service_name', 'attachments')
      then 'MISSING (run supabase/opportunities-service-gigs-schema.sql)'
    else 'MISSING'
  end
from (values
  ('profiles','phone_e164'),
  ('profiles','phone_verified_at'),
  ('conversations','is_secret'),
  ('conversations','kind'),
  ('conversations','name'),
  ('conversations','description'),
  ('conversations','avatar_url'),
  ('conversations','created_by'),
  ('conversations','is_public'),
  ('conversation_members','role'),
  ('messages','message_type'),
  ('messages','media_url'),
  ('messages','media_duration_seconds'),
  ('messages','expires_at'),
  ('messages','sent_gift_id'),
  ('profiles','last_seen_at'),
  ('posts','edited_at'),
  ('posts','post_context'),
  ('messages','edited_at'),
  ('profiles','account_kind'),
  ('profiles','business_enabled'),
  ('profiles','active_mode'),
  ('profiles','business_name'),
  ('profiles','business_category'),
  ('profiles','business_tagline'),
  ('profiles','business_description'),
  ('profiles','business_website'),
  ('profiles','business_email'),
  ('profiles','business_phone'),
  ('profiles','business_location'),
  ('profiles','business_cover_url'),
  ('profiles','business_services'),
  ('profiles','business_contact_enabled'),
  ('profiles','business_auto_reply_enabled'),
  ('profiles','business_featured'),
  ('conversation_member_settings','is_pinned'),
  ('conversation_member_settings','translation_enabled'),
  ('profiles','is_private'),
  ('profiles','dm_policy'),
  ('profiles','ai_assistant_enabled'),
  ('profiles','profile_theme'),
  ('conversation_member_settings','notifications_muted'),
  ('conversation_member_settings','last_read_at'),
  ('messages','poll_id'),
  ('messages','reply_to_id'),
  ('messages','chat_payment_id'),
  ('comments','reply_to_id'),
  ('opportunities','listing_kind'),
  ('opportunities','service_name'),
  ('opportunities','attachments')
) as c(tbl, col);

-- ── Functions ────────────────────────────────────────────────────────────────
insert into __zumelia_diag
select 'function', f,
  case when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = f
  ) then 'OK' else 'MISSING (run supabase/opportunities-schema.sql)' end
from unnest(array[
  'zumelia_assistant_id','is_zumelia_assistant','can_dm_without_mutual_friends'
]) as f;

-- Other functions (not from opportunities-schema)
insert into __zumelia_diag
select 'function', f,
  case when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = f
  ) then 'OK' else 'MISSING' end
from unnest(array[
  'normalize_phone_e164','sync_my_verified_phone','find_user_by_phone',
  'is_conversation_admin','is_conversation_member','are_mutual_friends'
]) as f;

-- ── Check constraints that must allow new enum values ────────────────────────
insert into __zumelia_diag
select 'constraint', 'messages.message_type allows ''gift''',
  case when exists (
    select 1 from pg_constraint
    where conname = 'messages_message_type_check'
      and pg_get_constraintdef(oid) like '%gift%'
  ) then 'OK' else 'MISSING (re-run gifts-schema.sql)' end;

insert into __zumelia_diag
select 'constraint', 'messages.message_type allows ''poll''',
  case when exists (
    select 1 from pg_constraint
    where conname = 'messages_message_type_check'
      and pg_get_constraintdef(oid) like '%poll%'
  ) then 'OK' else 'MISSING (run supabase/trust-safety-schema.sql)' end;

insert into __zumelia_diag
select 'constraint', 'notifications.type allows ''gift''',
  case when exists (
    select 1 from pg_constraint
    where conname = 'notifications_type_check'
      and pg_get_constraintdef(oid) like '%gift%'
  ) then 'OK' else 'MISSING (re-run gifts-schema.sql)' end;

-- ── Storage buckets ──────────────────────────────────────────────────────────
insert into __zumelia_diag
select 'bucket', b,
  case when exists (select 1 from storage.buckets where id = b)
       then 'OK' else 'MISSING' end
from unnest(array[
  'avatars','post-media','status-media','user-videos','voice-messages','chat-wallpapers','business-media','opportunity-media'
]) as b;

-- ── Realtime publication (incoming calls + live gifts need these) ────────────
insert into __zumelia_diag
select 'realtime', t,
  case when exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
  ) then 'OK' else 'MISSING' end
from unnest(array['messages','call_sessions','sent_gifts']) as t;

-- ── Seed data (guarded so missing tables don't break the script) ─────────────
do $$
begin
  if to_regclass('public.gift_catalog') is not null then
    execute $q$
      insert into __zumelia_diag
      select 'data', 'gift_catalog seeded',
        case when count(*) > 0 then 'OK (' || count(*) || ' gifts)'
             else 'EMPTY (re-run gifts-schema.sql)' end
      from public.gift_catalog
    $q$;
  else
    insert into __zumelia_diag values ('data', 'gift_catalog seeded', 'MISSING TABLE');
  end if;
end $$;

-- Assistant bot profile (created on first API call if missing)
insert into __zumelia_diag
select 'data', 'zumelia-ai assistant profile',
  case when exists (select 1 from public.profiles where username = 'zumelia-ai')
       then 'OK' else 'MISSING (run supabase/seed-zumelia-ai.sql)' end;

-- ── Report (problems first) ──────────────────────────────────────────────────
select area, item, status
from __zumelia_diag
order by (status like 'OK%') asc, area, item;
