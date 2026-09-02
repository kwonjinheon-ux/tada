-- Keep every value entered by the service registration editor queryable.
-- Category-specific answers remain in JSONB so adding a category does not
-- require another table, while the public profile fields stay easy to index.
alter table public.service_listings
  add column if not exists service_summary text,
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists address_visibility text not null default 'area';

alter table public.service_listings
  add constraint service_listings_summary_check
    check (service_summary is null or char_length(trim(service_summary)) between 1 and 100),
  add constraint service_listings_languages_check
    check (cardinality(languages) <= 20),
  add constraint service_listings_address_visibility_check
    check (address_visibility in ('area', 'exact'));

-- The newer real-estate and travel/study forms use these units in addition to
-- the original service units.
alter table public.service_listings
  drop constraint if exists service_listings_price_unit_check;

alter table public.service_listings
  add constraint service_listings_price_unit_check
    check (price_unit is null or price_unit in (
      'hour', 'visit', 'job', 'session', 'day', 'person', 'quote',
      'commission', 'week', 'property', 'booking', 'consultation', 'application'
    ));

comment on column public.service_listings.service_summary is 'Optional one-line summary shown near the service title.';
comment on column public.service_listings.languages is 'Languages the provider can serve customers in.';
comment on column public.service_listings.address_visibility is 'Whether the profile shows only the area or the exact street address.';
