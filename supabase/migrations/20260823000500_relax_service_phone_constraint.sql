-- Service providers often enter NZ phone numbers with spaces, dashes or an
-- international prefix. The client normalizes those formats before storage;
-- this constraint now validates that canonical representation.
alter table public.service_listings
  drop constraint if exists service_listings_phone_check;

alter table public.service_listings
  add constraint service_listings_phone_check
  check (phone ~ '^[+]?[0-9]{7,20}$') not valid;

comment on column public.service_listings.phone is 'Provider phone in canonical digits-only or E.164-style format.';
