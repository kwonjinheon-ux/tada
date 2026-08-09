-- Garage and Moving Sale listings are independent Bargain events. Their
-- schedule, public-facing address, and item metadata stay outside Market.
alter table public.bargain_listings
  add column if not exists event_start_date date,
  add column if not exists event_end_date date,
  add column if not exists event_start_time time,
  add column if not exists event_end_time time,
  add column if not exists event_address text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bargain_listings_event_date_range_check') then
    alter table public.bargain_listings add constraint bargain_listings_event_date_range_check
      check (event_start_date is null or event_end_date is null or event_end_date >= event_start_date);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bargain_listings_event_address_length_check') then
    alter table public.bargain_listings add constraint bargain_listings_event_address_length_check
      check (event_address is null or char_length(trim(event_address)) between 5 and 240);
  end if;
end $$;

alter table public.bargain_listing_items
  add column if not exists title text,
  add column if not exists category_slug text;

update public.bargain_listing_items
set title = concat('Item ', display_order + 1)
where title is null or char_length(trim(title)) = 0;

alter table public.bargain_listing_items
  alter column title set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bargain_listing_items_title_length_check') then
    alter table public.bargain_listing_items add constraint bargain_listing_items_title_length_check
      check (char_length(trim(title)) between 1 and 120);
  end if;
end $$;
