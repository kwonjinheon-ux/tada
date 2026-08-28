alter table public.group_buy_orders
  add column if not exists buyer_email text;

alter table public.group_buy_orders
  drop constraint if exists group_buy_orders_buyer_email_check;

alter table public.group_buy_orders
  add constraint group_buy_orders_buyer_email_check
  check (buyer_email is null or buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

create index if not exists group_buy_orders_buyer_email_idx
  on public.group_buy_orders (buyer_email);
