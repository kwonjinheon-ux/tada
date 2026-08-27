alter table public.service_listings
  add column if not exists languages text[] not null default array['English']::text[];

alter table public.service_listings
  add constraint service_listings_languages_limit_check
  check (cardinality(languages) between 1 and 5);
