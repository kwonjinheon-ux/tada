-- The service category list has grown past the eight slugs the table was
-- created with: cleaningServices and computerIt were added to the app without
-- a matching migration, so submitting either was rejected by this check.
-- Widen it once to cover every category the app offers today, including the
-- new realEstate and travelStudy ones.

alter table public.service_listings
  drop constraint if exists service_listings_category_slug_check;

alter table public.service_listings
  add constraint service_listings_category_slug_check
  check (category_slug in (
    'cleaning',
    'cleaningServices',
    'computerIt',
    'handyman',
    'moving',
    'auto',
    'gardening',
    'tutoring',
    'travelStudy',
    'beauty',
    'petCare',
    'realEstate'
  ));
