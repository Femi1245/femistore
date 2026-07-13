-- Post analytics: unique views per post (run AFTER social-schema.sql)

create table if not exists public.post_views (
  post_id uuid not null references public.posts (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (post_id, viewer_id)
);

create index if not exists post_views_post_viewed_idx
  on public.post_views (post_id, viewed_at desc);

create index if not exists post_views_viewer_idx
  on public.post_views (viewer_id);

alter table public.post_views enable row level security;

drop policy if exists "Users record post views" on public.post_views;
create policy "Users record post views"
  on public.post_views for insert to authenticated
  with check (viewer_id = auth.uid());

drop policy if exists "Users update own post views" on public.post_views;
create policy "Users update own post views"
  on public.post_views for update to authenticated
  using (viewer_id = auth.uid())
  with check (viewer_id = auth.uid());

drop policy if exists "Owners and viewers read post views" on public.post_views;
create policy "Owners and viewers read post views"
  on public.post_views for select to authenticated
  using (
    viewer_id = auth.uid()
    or exists (
      select 1
      from public.posts p
      where p.id = post_views.post_id
        and p.user_id = auth.uid()
    )
  );
