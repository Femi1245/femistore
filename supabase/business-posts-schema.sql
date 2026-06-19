-- Business vs personal posts — run after social-schema.sql

alter table public.posts
  add column if not exists post_context text not null default 'personal'
    check (post_context in ('personal', 'business'));

create index if not exists posts_user_context_created_idx
  on public.posts (user_id, post_context, created_at desc);
