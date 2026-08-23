-- Store the comparable price separately and retain the category-specific
-- answers in JSONB. This keeps every service type queryable while avoiding one
-- table per category as the service catalogue evolves.
alter table public.service_listings
  add column if not exists price_from numeric(10, 2),
  add column if not exists price_unit text,
  add column if not exists service_details jsonb not null default '{}'::jsonb;

alter table public.service_listings
  add constraint service_listings_price_from_check
    check (price_from is null or price_from >= 0),
  add constraint service_listings_price_unit_check
    check (price_unit is null or price_unit in ('hour', 'visit', 'job', 'session', 'day', 'person', 'quote')),
  add constraint service_listings_details_object_check
    check (jsonb_typeof(service_details) = 'object'),
  add constraint service_listings_details_shape_check
    check (
      service_details = '{}'::jsonb
      or (
        service_details ? 'service_type'
        or category_slug = 'tutoring' and service_details ? 'subject'
      )
    );

create index if not exists service_listings_price_idx
  on public.service_listings (category_slug, price_unit, price_from)
  where status = 'published' and price_from is not null;

comment on column public.service_listings.price_from is 'Starting advertised price in NZD for the selected price unit.';
comment on column public.service_listings.price_unit is 'Advertised price unit: hour, visit, job, session, day, person, or quote.';
comment on column public.service_listings.service_details is 'Category-specific required answers collected when the service listing is created.';
