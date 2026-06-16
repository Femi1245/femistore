-- Business accounts — run after schema.sql + social-schema.sql

alter table public.profiles
  add column if not exists account_kind text not null default 'personal'
    check (account_kind in ('personal', 'business')),
  add column if not exists business_enabled boolean not null default false,
  add column if not exists active_mode text not null default 'personal'
    check (active_mode in ('personal', 'business')),
  add column if not exists business_name text,
  add column if not exists business_category text,
  add column if not exists business_tagline text,
  add column if not exists business_description text,
  add column if not exists business_website text,
  add column if not exists business_email text,
  add column if not exists business_phone text,
  add column if not exists business_location text,
  add column if not exists business_cover_url text,
  add column if not exists business_services text;

create index if not exists profiles_business_idx
  on public.profiles (account_kind, business_enabled)
  where account_kind = 'business' or business_enabled = true;

-- Business cover / logo storage
insert into storage.buckets (id, name, public)
values ('business-media', 'business-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Business media is publicly accessible" on storage.objects;
create policy "Business media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'business-media');

drop policy if exists "Users can upload business media" on storage.objects;
create policy "Users can upload business media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own business media" on storage.objects;
create policy "Users can delete own business media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
