alter table public.profiles
  add column if not exists main_location text,
  add column if not exists sub_location text,
  add column if not exists locality text,
  add column if not exists raw_suburb text,
  add column if not exists region text;

update public.profiles
set main_location = coalesce(main_location, region_city),
    sub_location = coalesce(sub_location, region_suburb)
where main_location is null or sub_location is null;

create index if not exists profiles_location_idx on public.profiles (main_location, sub_location);
