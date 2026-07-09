-- Extend email automation types (welcome + re-engagement reminders)
-- Run after email-notifications-schema.sql

alter table public.email_notification_log
  drop constraint if exists email_notification_log_notification_type_check;

alter table public.email_notification_log
  add constraint email_notification_log_notification_type_check
  check (notification_type in ('birthday', 'purchase', 'welcome', 'reengagement'));
