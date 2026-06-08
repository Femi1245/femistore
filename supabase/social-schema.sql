-- iTunes social features — run in Supabase SQL Editor AFTER schema.sql

-- Profile fields
alter table public.profiles
  add column if not exists date_of_birth date;

-- Follow / Connect
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx on public.follows (follower_id);

-- Posts (text, image, video, or reshare)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text default '',
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  reshare_of uuid references public.posts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists posts_user_created_idx on public.posts (user_id, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- Likes
create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- Reshares (also creates a post with reshare_of set from the app)
create table if not exists public.post_reshares (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- RLS
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.post_reshares enable row level security;

-- Follows policies
drop policy if exists "Anyone authenticated can view follows" on public.follows;
create policy "Anyone authenticated can view follows"
  on public.follows for select to authenticated using (true);

drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others"
  on public.follows for insert to authenticated
  with check (follower_id = auth.uid());

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow"
  on public.follows for delete to authenticated
  using (follower_id = auth.uid());

-- Posts policies
drop policy if exists "Anyone authenticated can view posts" on public.posts;
create policy "Anyone authenticated can view posts"
  on public.posts for select to authenticated using (true);

drop policy if exists "Users can create posts" on public.posts;
create policy "Users can create posts"
  on public.posts for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete to authenticated
  using (user_id = auth.uid());

-- Likes policies
drop policy if exists "Anyone can view likes" on public.post_likes;
create policy "Anyone can view likes"
  on public.post_likes for select to authenticated using (true);

drop policy if exists "Users can like posts" on public.post_likes;
create policy "Users can like posts"
  on public.post_likes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can unlike posts" on public.post_likes;
create policy "Users can unlike posts"
  on public.post_likes for delete to authenticated
  using (user_id = auth.uid());

-- Comments policies
drop policy if exists "Anyone can view comments" on public.comments;
create policy "Anyone can view comments"
  on public.comments for select to authenticated using (true);

drop policy if exists "Users can comment" on public.comments;
create policy "Users can comment"
  on public.comments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
  on public.comments for delete to authenticated
  using (user_id = auth.uid());

-- Reshares policies
drop policy if exists "Anyone can view reshares" on public.post_reshares;
create policy "Anyone can view reshares"
  on public.post_reshares for select to authenticated using (true);

drop policy if exists "Users can reshare" on public.post_reshares;
create policy "Users can reshare"
  on public.post_reshares for insert to authenticated
  with check (user_id = auth.uid());

-- Storage buckets (avatars + post media)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do update set public = true;

-- Avatar storage policies
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Post media storage policies
drop policy if exists "Post media is publicly accessible" on storage.objects;
create policy "Post media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'post-media');

drop policy if exists "Users can upload post media" on storage.objects;
create policy "Users can upload post media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own post media" on storage.objects;
create policy "Users can delete own post media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Realtime (optional)
do $$
begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null;
end $$;
