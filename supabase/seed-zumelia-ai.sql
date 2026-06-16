-- ═══════════════════════════════════════════════════════════════════════════
-- Seed @zumelia-ai assistant (auth user + profile)
-- Run in Supabase SQL Editor AFTER assistant-bot-schema.sql
-- Safe to re-run — skips if username zumelia-ai already exists.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

do $$
declare
  assistant_id uuid := 'a0000000-0000-4000-8000-000000000001';
  assistant_email text := 'zumelia-ai@assistant.zumelia.app';
begin
  if exists (
    select 1 from public.profiles where username = 'zumelia-ai'
  ) then
    raise notice 'zumelia-ai profile already exists — nothing to do.';
    return;
  end if;

  if not exists (select 1 from auth.users where id = assistant_id) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      assistant_id,
      'authenticated',
      'authenticated',
      assistant_email,
      crypt('zumelia-ai-system-' || assistant_id::text, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Zumelia AI","username":"zumelia-ai"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  end if;

  if not exists (
    select 1 from auth.identities
    where user_id = assistant_id and provider = 'email'
  ) then
    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      assistant_id,
      assistant_id::text,
      format('{"sub":"%s","email":"%s"}', assistant_id, assistant_email)::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  end if;

  insert into public.profiles (id, username, display_name, country, bio)
  values (
    assistant_id,
    'zumelia-ai',
    'Zumelia AI',
    'Global',
    'Your Zumelia assistant — ask me anything about the app, your business, or everyday topics.'
  )
  on conflict (id) do update set
    username = excluded.username,
    display_name = excluded.display_name,
    bio = excluded.bio;

  raise notice 'zumelia-ai assistant created (id: %)', assistant_id;
end $$;

-- Quick check
select id, username, display_name
from public.profiles
where username = 'zumelia-ai';
