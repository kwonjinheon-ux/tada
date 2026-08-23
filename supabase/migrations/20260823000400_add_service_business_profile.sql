-- Keep the service listing's public business profile queryable, while allowing
-- older listings to remain visible without backfilling private contact data.
alter table public.service_listings
  add column if not exists street_address text,
  add column if not exists weekday_hours text,
  add column if not exists saturday_hours text,
  add column if not exists sunday_hours text,
  add column if not exists founded_year integer;

alter table public.service_listings
  add constraint service_listings_street_address_check
    check (street_address is null or char_length(trim(street_address)) between 5 and 200),
  add constraint service_listings_weekday_hours_check
    check (weekday_hours is null or char_length(trim(weekday_hours)) between 2 and 80),
  add constraint service_listings_saturday_hours_check
    check (saturday_hours is null or char_length(trim(saturday_hours)) <= 80),
  add constraint service_listings_sunday_hours_check
    check (sunday_hours is null or char_length(trim(sunday_hours)) <= 80),
  add constraint service_listings_founded_year_check
    check (founded_year is null or founded_year between 1800 and 2100);

alter table public.service_listing_photos
  add column if not exists photo_kind text not null default 'gallery',
  add constraint service_listing_photos_kind_check
    check (photo_kind in ('logo', 'gallery'));

create unique index if not exists service_listing_one_logo_idx
  on public.service_listing_photos (listing_id)
  where photo_kind = 'logo';

comment on column public.service_listings.street_address is 'Public street address used for directions on the service profile.';
comment on column public.service_listings.weekday_hours is 'Required weekday operating hours entered by the provider.';
comment on column public.service_listings.saturday_hours is 'Optional Saturday operating hours entered by the provider.';
comment on column public.service_listings.sunday_hours is 'Optional Sunday and public holiday operating hours entered by the provider.';
comment on column public.service_listings.founded_year is 'Optional year the provider established the business.';
comment on column public.service_listing_photos.photo_kind is 'logo for the single business logo, gallery for work photos.';
