-- Celebrity / public figure verification — run in Supabase SQL Editor
-- Grants a verified badge on profiles after admin review.

-- Profile badge fields
alter table public.profiles
  add column if not exists is_verified boolean not null default false;

alter table public.profiles
  add column if not exists verified_at timestamptz;

alter table public.profiles
  add column if not exists verified_category text
    check (verified_category is null or verified_category in (
      'public_figure', 'celebrity', 'official', 'notable'
    ));

alter table public.profiles
  add column if not exists verified_by uuid references public.profiles (id) on delete set null;

create index if not exists profiles_verified_idx
  on public.profiles (is_verified, verified_at desc nulls last)
  where is_verified = true;

-- Platform admins (who can use /admin/verification)
create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles (id) on delete set null
);

alter table public.platform_admins enable row level security;

drop policy if exists "Admins can view own admin row" on public.platform_admins;
create policy "Admins can view own admin row"
  on public.platform_admins for select to authenticated
  using (user_id = auth.uid());

-- Verification requests (users apply; admins approve in dashboard)
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  category text not null
    check (category in ('public_figure', 'celebrity', 'official', 'notable')),
  public_links text[] not null default '{}',
  applicant_note text not null default '',
  admin_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists verification_requests_status_idx
  on public.verification_requests (status, created_at desc);

create index if not exists verification_requests_user_idx
  on public.verification_requests (user_id, created_at desc);

create unique index if not exists verification_requests_one_pending_per_user
  on public.verification_requests (user_id)
  where status = 'pending';

alter table public.verification_requests enable row level security;

drop policy if exists "Users view own verification requests" on public.verification_requests;
create policy "Users view own verification requests"
  on public.verification_requests for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users submit verification requests" on public.verification_requests;
create policy "Users submit verification requests"
  on public.verification_requests for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_verified = true
    )
    and not exists (
      select 1 from public.verification_requests vr
      where vr.user_id = auth.uid() and vr.status = 'pending'
    )
  );

-- Users cannot self-grant verified badge
create or replace function public.protect_profile_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.id then
    if new.is_verified is distinct from old.is_verified
      or new.verified_at is distinct from old.verified_at
      or new.verified_category is distinct from old.verified_category
      or new.verified_by is distinct from old.verified_by
    then
      new.is_verified := old.is_verified;
      new.verified_at := old.verified_at;
      new.verified_category := old.verified_category;
      new.verified_by := old.verified_by;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_verification on public.profiles;
create trigger protect_profile_verification
  before update on public.profiles
  for each row execute function public.protect_profile_verification_fields();

-- Platform admin: @femisaint (run after profile exists)
insert into public.platform_admins (user_id)
select id from public.profiles where lower(username) = 'femisaint'
on conflict (user_id) do nothing;
