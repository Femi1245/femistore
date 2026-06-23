-- Zumelia opportunities board — jobs, gigs, collabs
-- Run AFTER schema.sql + social-schema.sql in Supabase SQL Editor

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null check (char_length(trim(description)) between 10 and 8000),
  opportunity_type text not null default 'gig'
    check (opportunity_type in ('job', 'gig', 'collab', 'internship', 'volunteer', 'other')),
  category text not null default 'Other',
  location text not null default '',
  work_mode text not null default 'remote'
    check (work_mode in ('remote', 'onsite', 'hybrid')),
  compensation_type text not null default 'negotiable'
    check (compensation_type in ('paid', 'unpaid', 'negotiable', 'commission')),
  compensation_detail text not null default '',
  application_url text,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunities_active_created_idx
  on public.opportunities (is_active, created_at desc)
  where is_active = true;

create index if not exists opportunities_poster_idx
  on public.opportunities (poster_id, created_at desc);

create index if not exists opportunities_type_idx
  on public.opportunities (opportunity_type, created_at desc);

alter table public.opportunities enable row level security;

drop policy if exists "Authenticated users can view active opportunities" on public.opportunities;
create policy "Authenticated users can view active opportunities"
  on public.opportunities for select to authenticated
  using (is_active = true or poster_id = auth.uid());

drop policy if exists "Users can create opportunities" on public.opportunities;
create policy "Users can create opportunities"
  on public.opportunities for insert to authenticated
  with check (poster_id = auth.uid());

drop policy if exists "Posters can update own opportunities" on public.opportunities;
create policy "Posters can update own opportunities"
  on public.opportunities for update to authenticated
  using (poster_id = auth.uid())
  with check (poster_id = auth.uid());

drop policy if exists "Posters can delete own opportunities" on public.opportunities;
create policy "Posters can delete own opportunities"
  on public.opportunities for delete to authenticated
  using (poster_id = auth.uid());

create or replace function public.set_opportunities_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists opportunities_updated_at on public.opportunities;
create trigger opportunities_updated_at
  before update on public.opportunities
  for each row execute function public.set_opportunities_updated_at();
