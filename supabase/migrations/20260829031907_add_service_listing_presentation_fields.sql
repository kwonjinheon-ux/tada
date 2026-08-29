alter table public.service_listings
  add column if not exists languages text[] not null default array['English']::text[],
  add column if not exists show_exact_address boolean not null default true;

alter table public.service_listings
  add constraint service_listings_languages_limit_check
  check (cardinality(languages) between 1 and 5);

comment on column public.service_listings.languages is
  'Languages a provider can use when communicating with customers.';

comment on column public.service_listings.show_exact_address is
  'Whether the service detail page may show the street address rather than only its service area.';
