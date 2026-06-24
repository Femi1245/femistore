-- Service / product gigs on the opportunities board (offering vs seeking)
-- Run AFTER supabase/opportunities-board-schema.sql

alter table public.opportunities
  add column if not exists listing_kind text not null default 'seeking'
    check (listing_kind in ('seeking', 'offering'));

alter table public.opportunities
  add column if not exists service_name text not null default '';

alter table public.opportunities
  add column if not exists attachments jsonb not null default '[]'::jsonb;

create index if not exists opportunities_listing_kind_idx
  on public.opportunities (listing_kind, is_active, created_at desc);

-- Media for service gigs (images, videos, PDFs/docs)
insert into storage.buckets (id, name, public)
values ('opportunity-media', 'opportunity-media', true)
on conflict (id) do nothing;

drop policy if exists "Opportunity media is publicly accessible" on storage.objects;
create policy "Opportunity media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'opportunity-media');

drop policy if exists "Users can upload opportunity media" on storage.objects;
create policy "Users can upload opportunity media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'opportunity-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own opportunity media" on storage.objects;
create policy "Users can delete own opportunity media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'opportunity-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
