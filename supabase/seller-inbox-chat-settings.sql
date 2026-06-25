-- Seller inbox + separate personal/business chat settings
-- Run after connection-requests-messaging-fix.sql

-- Per-conversation inbox (personal friends vs customer/seller messages)
alter table public.conversation_member_settings
  add column if not exists inbox text not null default 'personal'
    check (inbox in ('personal', 'business'));

create index if not exists conversation_member_settings_inbox_idx
  on public.conversation_member_settings (user_id, inbox);

-- Separate DM policies for personal profile vs business storefront
alter table public.profiles
  add column if not exists personal_dm_policy text
    check (personal_dm_policy is null or personal_dm_policy in ('everyone', 'friends', 'business_only', 'nobody'));

alter table public.profiles
  add column if not exists business_dm_policy text
    check (business_dm_policy is null or business_dm_policy in ('everyone', 'friends', 'business_only', 'nobody'));

update public.profiles
set personal_dm_policy = coalesce(personal_dm_policy, dm_policy, 'friends')
where personal_dm_policy is null;

update public.profiles
set business_dm_policy = coalesce(
  business_dm_policy,
  case when business_enabled or business_name is not null then 'everyone' else dm_policy end,
  'everyone'
)
where business_dm_policy is null;
