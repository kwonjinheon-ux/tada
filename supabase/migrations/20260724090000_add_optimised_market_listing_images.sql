alter table public.market_listing_photos
  add column if not exists thumbnail_path text,
  add column if not exists listing_path text,
  add column if not exists detail_path text,
  add column if not exists image_format text,
  add column if not exists width integer,
  add column if not exists height integer;

alter table public.market_listing_photos
  drop constraint if exists market_listing_photos_image_format_check;

alter table public.market_listing_photos
  add constraint market_listing_photos_image_format_check
  check (image_format is null or image_format in ('webp', 'avif'));

alter table public.market_listing_photos
  drop constraint if exists market_listing_photos_mime_type_check;

alter table public.market_listing_photos
  add constraint market_listing_photos_mime_type_check
  check (mime_type is null or mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif'));

alter table public.market_listing_photos
  drop constraint if exists market_listing_photos_dimensions_check;

alter table public.market_listing_photos
  add constraint market_listing_photos_dimensions_check
  check (
    (width is null and height is null)
    or (width between 1 and 2000 and height between 1 and 2000)
  );

create index if not exists market_listing_photos_thumbnail_path_idx
  on public.market_listing_photos (thumbnail_path)
  where thumbnail_path is not null;

update storage.buckets
set
  file_size_limit = 4194304,
  allowed_mime_types = array['image/webp', 'image/avif']
where id = 'market-listing-images';

-- Listing images are created only by the server-side optimiser. Keep the
-- browser upload exception narrowly scoped to temporary AI draft WebP files.
drop policy if exists "Users upload own market listing images" on storage.objects;
drop policy if exists "Users update own market listing images" on storage.objects;
drop policy if exists "Users delete own market listing images" on storage.objects;
drop policy if exists "Users read own market listing images" on storage.objects;

create policy "Users manage own AI draft images" on storage.objects
for all to authenticated
using (
  bucket_id = 'market-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] = 'ai-drafts'
  and lower(storage.extension(name)) = 'webp'
)
with check (
  bucket_id = 'market-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] = 'ai-drafts'
  and lower(storage.extension(name)) = 'webp'
);

drop policy if exists "Users create own market listing photos" on public.market_listing_photos;
drop policy if exists "Users update own market listing photos" on public.market_listing_photos;
drop policy if exists "Users delete own market listing photos" on public.market_listing_photos;

drop policy if exists "Published market listing images are readable" on storage.objects;

create policy "Published market listing image variants are readable" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'market-listing-images'
  and exists (
    select 1
    from public.market_listing_photos
    join public.market_listings on market_listings.id = market_listing_photos.listing_id
    where (
      market_listing_photos.storage_path = storage.objects.name
      or market_listing_photos.thumbnail_path = storage.objects.name
      or market_listing_photos.listing_path = storage.objects.name
      or market_listing_photos.detail_path = storage.objects.name
    )
      and (market_listings.status = 'published' or market_listings.owner_id = (select auth.uid()))
  )
);

comment on column public.market_listing_photos.thumbnail_path is '400px max-edge, metadata-stripped delivery image';
comment on column public.market_listing_photos.listing_path is '800px max-edge, metadata-stripped delivery image';
comment on column public.market_listing_photos.detail_path is '2000px max-edge, metadata-stripped delivery image';
