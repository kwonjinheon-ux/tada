alter table public.profiles
  add column if not exists listing_description_text_step smallint not null default 0
  check (listing_description_text_step between 0 and 5);
