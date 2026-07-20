-- Auto-dispatch phone push when a notification row is inserted.
-- Run scripts/setup-push-notifications.mjs to store the webhook secret and enable pg_net.

create extension if not exists pg_net with schema extensions;

create schema if not exists private;

create table if not exists private.push_config (
  key text primary key,
  value text not null
);

revoke all on schema private from public;
revoke all on table private.push_config from public;

create or replace function private.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  webhook_secret text;
  dispatch_url text := 'https://itunes-mu.vercel.app/api/push/dispatch';
begin
  select value into webhook_secret
  from private.push_config
  where key = 'webhook_secret'
  limit 1;

  if webhook_secret is null or webhook_secret = '' then
    return NEW;
  end if;

  perform net.http_post(
    url := dispatch_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    ),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );

  return NEW;
exception
  when others then
    -- Never block notification inserts if push dispatch fails.
    return NEW;
end;
$$;

drop trigger if exists trg_notifications_push_dispatch on public.notifications;
create trigger trg_notifications_push_dispatch
  after insert on public.notifications
  for each row
  execute function private.dispatch_push_notification();
