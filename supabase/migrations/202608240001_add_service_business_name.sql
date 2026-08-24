alter table public.service_listings
  add column if not exists business_name text;

update public.service_listings
set business_name = provider_name
where business_name is null;

alter table public.service_listings
  alter column business_name set not null;

alter table public.service_listings
  add constraint service_listings_business_name_check
  check (char_length(trim(business_name)) between 2 and 100);

comment on column public.service_listings.business_name is
  'Public business or provider name shown in service contact details.';
