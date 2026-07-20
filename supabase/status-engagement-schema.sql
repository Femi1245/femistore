-- Status engagement: views (owner-visible), likes, comments, reshares
-- Run AFTER status-schema.sql and notifications-schema.sql

-- Allow owners to see who viewed their status + upsert on re-view
drop policy if exists "Users read status views" on public.status_views;
drop policy if exists "Owners and viewers read status views" on public.status_views;
create policy "Owners and viewers read status views"
  on public.status_views for select to authenticated
  using (
    viewer_id = auth.uid()
    or exists (
      select 1
      from public.status_updates s
      where s.id = status_views.status_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Users update own status views" on public.status_views;
create policy "Users update own status views"
  on public.status_views for update to authenticated
  using (viewer_id = auth.uid())
  with check (viewer_id = auth.uid());

create index if not exists status_views_status_viewed_idx
  on public.status_views (status_id, viewed_at desc);

-- Optional reshare pointer on statuses
alter table public.status_updates
  add column if not exists reshare_of uuid references public.status_updates (id) on delete set null;

-- Likes
create table if not exists public.status_likes (
  status_id uuid not null references public.status_updates (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (status_id, user_id)
);

create index if not exists status_likes_user_idx on public.status_likes (user_id);

alter table public.status_likes enable row level security;

drop policy if exists "Read status likes" on public.status_likes;
create policy "Read status likes"
  on public.status_likes for select to authenticated
  using (
    exists (
      select 1 from public.status_updates s
      where s.id = status_likes.status_id
        and (
          s.user_id = auth.uid()
          or exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid() and f.following_id = s.user_id
          )
        )
    )
  );

drop policy if exists "Users like statuses" on public.status_likes;
create policy "Users like statuses"
  on public.status_likes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users unlike statuses" on public.status_likes;
create policy "Users unlike statuses"
  on public.status_likes for delete to authenticated
  using (user_id = auth.uid());

-- Comments
create table if not exists public.status_comments (
  id uuid primary key default gen_random_uuid(),
  status_id uuid not null references public.status_updates (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) > 0 and char_length(content) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists status_comments_status_idx
  on public.status_comments (status_id, created_at asc);

alter table public.status_comments enable row level security;

drop policy if exists "Read status comments" on public.status_comments;
create policy "Read status comments"
  on public.status_comments for select to authenticated
  using (
    exists (
      select 1 from public.status_updates s
      where s.id = status_comments.status_id
        and (
          s.user_id = auth.uid()
          or exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid() and f.following_id = s.user_id
          )
        )
    )
  );

drop policy if exists "Users comment on statuses" on public.status_comments;
create policy "Users comment on statuses"
  on public.status_comments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users delete own status comments" on public.status_comments;
create policy "Users delete own status comments"
  on public.status_comments for delete to authenticated
  using (user_id = auth.uid());

-- Reshares (junction + optional new status via reshare_of)
create table if not exists public.status_reshares (
  status_id uuid not null references public.status_updates (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (status_id, user_id)
);

create index if not exists status_reshares_user_idx on public.status_reshares (user_id);

alter table public.status_reshares enable row level security;

drop policy if exists "Read status reshares" on public.status_reshares;
create policy "Read status reshares"
  on public.status_reshares for select to authenticated
  using (
    exists (
      select 1 from public.status_updates s
      where s.id = status_reshares.status_id
        and (
          s.user_id = auth.uid()
          or exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid() and f.following_id = s.user_id
          )
        )
    )
  );

drop policy if exists "Users reshare statuses" on public.status_reshares;
create policy "Users reshare statuses"
  on public.status_reshares for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users undo status reshare" on public.status_reshares;
create policy "Users undo status reshare"
  on public.status_reshares for delete to authenticated
  using (user_id = auth.uid());

-- Notifications (reuse like / comment / reshare with entity_type = 'status')
create or replace function public.notify_on_status_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.status_updates where id = new.status_id;
  perform public.create_notification(
    v_owner,
    new.user_id,
    'like',
    'status',
    new.status_id::text
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_status_like on public.status_likes;
create trigger trg_notify_status_like
  after insert on public.status_likes
  for each row execute function public.notify_on_status_like();

create or replace function public.notify_on_status_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.status_updates where id = new.status_id;
  perform public.create_notification(
    v_owner,
    new.user_id,
    'comment',
    'status',
    new.status_id::text,
    left(new.content, 120)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_status_comment on public.status_comments;
create trigger trg_notify_status_comment
  after insert on public.status_comments
  for each row execute function public.notify_on_status_comment();

create or replace function public.notify_on_status_reshare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.status_updates where id = new.status_id;
  perform public.create_notification(
    v_owner,
    new.user_id,
    'reshare',
    'status',
    new.status_id::text
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_status_reshare on public.status_reshares;
create trigger trg_notify_status_reshare
  after insert on public.status_reshares
  for each row execute function public.notify_on_status_reshare();
