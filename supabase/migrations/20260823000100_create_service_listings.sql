-- Service providers are independent from marketplace listings: service work
-- is reviewed before publication and its contact details belong to the provider.
create extension if not exists "pgcrypto";

create type public.service_listing_status as enum ('pending', 'published', 'hidden', 'archived');
create type public.service_provider_type as enum ('business', 'sole_trader');

create table public.service_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_slug text not null check (category_slug in ('cleaning', 'handyman', 'moving', 'auto', 'gardening', 'tutoring', 'beauty', 'petCare')),
  provider_name text not null check (char_length(trim(provider_name)) between 2 and 100),
  description text not null check (char_length(trim(description)) between 20 and 2000),
  provider_type public.service_provider_type not null,
  service_areas text[] not null check (cardinality(service_areas) between 1 and 20),
  suburbs text[] not null default '{}'::text[] check (cardinality(suburbs) <= 100),
  phone text not null check (char_length(trim(phone)) between 7 and 32),
  email text check (email is null or char_length(trim(email)) <= 254),
  website text check (website is null or char_length(trim(website)) <= 500),
  status public.service_listing_status not null default 'pending',
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.service_listings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  original_name text,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  unique (listing_id, display_order)
);

create index service_listings_browse_idx on public.service_listings (status, category_slug, created_at desc);
create index service_listings_owner_idx on public.service_listings (owner_id, created_at desc);
create index service_listing_photos_listing_idx on public.service_listing_photos (listing_id, display_order);

alter table public.service_listings enable row level security;
alter table public.service_listing_photos enable row level security;

grant select on public.service_listings, public.service_listing_photos to anon, authenticated;
grant insert, update, delete on public.service_listings, public.service_listing_photos to authenticated;

create policy "Published services are readable" on public.service_listings
for select to anon, authenticated
using (status = 'published' or owner_id = (select auth.uid()));

create policy "Users create own service listings" on public.service_listings
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "Users update own service listings" on public.service_listings
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Users delete own service listings" on public.service_listings
for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "Visible service photos are readable" on public.service_listing_photos
for select to anon, authenticated
using (exists (
  select 1 from public.service_listings
  where service_listings.id = service_listing_photos.listing_id
    and (service_listings.status = 'published' or service_listings.owner_id = (select auth.uid()))
));

create policy "Users create own service photos" on public.service_listing_photos
for insert to authenticated
with check (owner_id = (select auth.uid()) and exists (
  select 1 from public.service_listings
  where service_listings.id = service_listing_photos.listing_id
    and service_listings.owner_id = (select auth.uid())
));

create policy "Users update own service photos" on public.service_listing_photos
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Users delete own service photos" on public.service_listing_photos
for delete to authenticated
using (owner_id = (select auth.uid()));

create or replace function public.touch_service_listing_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger service_listings_touch_updated_at
before update on public.service_listings
for each row execute function public.touch_service_listing_updated_at();

insert into storage.buckets (id, name, public)
values ('service-listing-images', 'service-listing-images', false)
on conflict (id) do nothing;

create policy "Users upload own service images" on storage.objects
for insert to authenticated
with check (bucket_id = 'service-listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users update own service images" on storage.objects
for update to authenticated
using (bucket_id = 'service-listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'service-listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete own service images" on storage.objects
for delete to authenticated
using (bucket_id = 'service-listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Visible service images are readable" on storage.objects
for select to anon, authenticated
using (bucket_id = 'service-listing-images' and exists (
  select 1
  from public.service_listing_photos
  join public.service_listings on service_listings.id = service_listing_photos.listing_id
  where service_listing_photos.storage_path = storage.objects.name
    and (service_listings.status = 'published' or service_listings.owner_id = (select auth.uid()))
));
