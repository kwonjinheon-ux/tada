-- Each registration can advertise up to twenty service options. The first
-- option is also mirrored in the indexed price columns for browse filters.
alter table public.service_listings
  add constraint service_listings_service_options_limit_check
    check (
      not (service_details ? 'services')
      or (
        jsonb_typeof(service_details->'services') = 'array'
        and jsonb_array_length(service_details->'services') between 1 and 20
      )
    );
