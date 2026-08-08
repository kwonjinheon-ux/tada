alter table public.market_listings
  add column if not exists main_location text,
  add column if not exists sub_location text,
  add column if not exists locality text,
  add column if not exists raw_suburb text,
  add column if not exists region text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

update public.market_listings
set main_location = coalesce(main_location, region_city),
    sub_location = coalesce(sub_location, region_suburb)
where main_location is null or sub_location is null;

alter table public.market_listings
  add constraint market_listings_latitude_range check (latitude is null or latitude between -90 and 90),
  add constraint market_listings_longitude_range check (longitude is null or longitude between -180 and 180);

create index if not exists market_listings_location_idx on public.market_listings (main_location, sub_location, created_at desc);
