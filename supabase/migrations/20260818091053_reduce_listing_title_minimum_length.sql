-- Keep existing records intact while permitting concise two-character titles.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select constraint_name, table_name
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name in ('market_listings', 'bargain_listings')
      and constraint_type = 'CHECK'
      and constraint_name in ('market_listings_title_check', 'bargain_listings_title_check')
  loop
    execute format('alter table public.%I drop constraint %I', constraint_row.table_name, constraint_row.constraint_name);
  end loop;
end;
$$;

alter table public.market_listings
  add constraint market_listings_title_check
  check (char_length(trim(title)) between 2 and 120);

alter table public.bargain_listings
  add constraint bargain_listings_title_check
  check (char_length(trim(title)) between 2 and 120);
