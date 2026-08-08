-- Bargain is an independent marketplace surface.  It deliberately has no
-- foreign keys to market_listings, market_listing_photos, or market categories.
create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'bargain_listing_status') then
    create type public.bargain_listing_status as enum ('draft', 'published', 'pending', 'sold', 'archived');
  end if;
end $$;

create table if not exists public.bargain_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 4 and 120),
  description text not null check (char_length(trim(description)) between 20 and 5000),
  category_slug text,
  subcategory_slug text,
  trade_method text not null default 'pickup_delivery' check (trade_method in ('pickup_delivery', 'pickup', 'delivery')),
  item_condition text not null default 'brand_new' check (item_condition in ('brand_new', 'like_new', 'excellent', 'good', 'fair')),
  price_cents integer not null default 0 check (price_cents >= 0),
  region_city text,
  region_suburb text,
  main_location text,
  sub_location text,
  locality text,
  raw_suburb text,
  region text,
  latitude numeric check (latitude is null or latitude between -90 and 90),
  longitude numeric check (longitude is null or longitude between -180 and 180),
  meeting_place text,
  status public.bargain_listing_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bargain_listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.bargain_listings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_bucket text not null default 'bargain-listing-images' check (storage_bucket = 'bargain-listing-images'),
  storage_path text not null,
  original_name text,
  mime_type text check (mime_type is null or mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer check (size_bytes is null or size_bytes <= 5242880),
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists bargain_listings_browse_idx on public.bargain_listings (status, created_at desc);
create index if not exists bargain_listings_location_idx on public.bargain_listings (main_location, sub_location, created_at desc);
create index if not exists bargain_listings_owner_idx on public.bargain_listings (owner_id, created_at desc);
create index if not exists bargain_listing_photos_listing_idx on public.bargain_listing_photos (listing_id, display_order);
create unique index if not exists bargain_listing_photos_one_primary_idx on public.bargain_listing_photos (listing_id) where is_primary;

grant select on public.bargain_listings, public.bargain_listing_photos to anon;
grant select, insert, update, delete on public.bargain_listings, public.bargain_listing_photos to authenticated;

alter table public.bargain_listings enable row level security;
alter table public.bargain_listing_photos enable row level security;

create policy "Visible bargain listings are publicly readable" on public.bargain_listings
for select to anon, authenticated using (status in ('published', 'pending', 'sold') or owner_id = (select auth.uid()));
create policy "Members create their own bargain listings" on public.bargain_listings
for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Members update their own bargain listings" on public.bargain_listings
for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Members delete their own bargain listings" on public.bargain_listings
for delete to authenticated using (owner_id = (select auth.uid()));

create policy "Visible bargain photos are publicly readable" on public.bargain_listing_photos
for select to anon, authenticated using (
  exists (select 1 from public.bargain_listings where bargain_listings.id = bargain_listing_photos.listing_id and (bargain_listings.status in ('published', 'pending', 'sold') or bargain_listings.owner_id = (select auth.uid())))
);
create policy "Members create photos for their own bargain listings" on public.bargain_listing_photos
for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (select 1 from public.bargain_listings where bargain_listings.id = bargain_listing_photos.listing_id and bargain_listings.owner_id = (select auth.uid()))
);
create policy "Members update their own bargain photos" on public.bargain_listing_photos
for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Members delete their own bargain photos" on public.bargain_listing_photos
for delete to authenticated using (owner_id = (select auth.uid()));

create or replace function public.touch_bargain_listings_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger bargain_listings_touch_updated_at before update on public.bargain_listings
for each row execute function public.touch_bargain_listings_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bargain-listing-images', 'bargain-listing-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Members upload their own bargain images" on storage.objects for insert to authenticated
with check (bucket_id = 'bargain-listing-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Members update their own bargain images" on storage.objects for update to authenticated
using (bucket_id = 'bargain-listing-images' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'bargain-listing-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Members delete their own bargain images" on storage.objects for delete to authenticated
using (bucket_id = 'bargain-listing-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Visible bargain images are publicly readable" on storage.objects for select to anon, authenticated
using (bucket_id = 'bargain-listing-images' and exists (
  select 1 from public.bargain_listing_photos join public.bargain_listings on bargain_listings.id = bargain_listing_photos.listing_id
  where bargain_listing_photos.storage_path = storage.objects.name and (bargain_listings.status in ('published', 'pending', 'sold') or bargain_listings.owner_id = (select auth.uid()))
));
