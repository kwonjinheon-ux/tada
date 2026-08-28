alter table public.group_buy_items
  drop constraint group_buy_items_name_check;

alter table public.group_buy_items
  add constraint group_buy_items_name_check
  check (char_length(trim(name)) between 1 and 100);
