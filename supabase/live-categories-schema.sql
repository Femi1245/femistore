-- Live stream categories — safe to run on an existing Zumelia database.

alter table public.live_streams
  add column if not exists category text not null default 'video';

alter table public.live_streams
  drop constraint if exists live_streams_category_check;

alter table public.live_streams
  add constraint live_streams_category_check
  check (category in ('video', 'gaming', 'music', 'talk', 'events', 'shopping'));

create index if not exists live_streams_category_live_idx
  on public.live_streams (category, is_live, started_at desc);
