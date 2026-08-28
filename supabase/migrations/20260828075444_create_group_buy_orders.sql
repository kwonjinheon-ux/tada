create type public.group_buy_fulfilment as enum ('pickup', 'delivery');

create table public.group_buy_orders (
  id uuid primary key default gen_random_uuid(),
  group_buy_id uuid not null references public.group_buys(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  reference text not null,
  buyer_name text not null check (char_length(trim(buyer_name)) between 1 and 120),
  buyer_phone text not null check (char_length(trim(buyer_phone)) between 3 and 50),
  fulfilment public.group_buy_fulfilment not null,
  delivery_address text,
  buyer_note text,
  subtotal_cents integer not null check (subtotal_cents > 0),
  delivery_cents integer not null default 0 check (delivery_cents >= 0),
  total_cents integer not null check (total_cents > 0),
  paid_at timestamptz,
  paid_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_buy_id, reference),
  check ((fulfilment = 'delivery') = (delivery_address is not null))
);
create table public.group_buy_order_items (
  order_id uuid not null references public.group_buy_orders(id) on delete cascade,
  item_id uuid not null references public.group_buy_items(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 1000),
  unit_price_cents integer not null check (unit_price_cents > 0),
  primary key (order_id, item_id)
);
create index group_buy_orders_group_buy_idx on public.group_buy_orders (group_buy_id, created_at);
alter table public.group_buy_orders enable row level security;
alter table public.group_buy_order_items enable row level security;
grant select, insert on public.group_buy_orders, public.group_buy_order_items to authenticated;
grant update on public.group_buy_orders to authenticated;
create policy "Buyers and owners read group buy orders" on public.group_buy_orders for select to authenticated using (buyer_id = (select auth.uid()) or exists (select 1 from public.group_buys where id = group_buy_id and owner_id = (select auth.uid())));
create policy "Buyers place group buy orders" on public.group_buy_orders for insert to authenticated with check (buyer_id = (select auth.uid()));
create policy "Owners mark group buy orders paid" on public.group_buy_orders for update to authenticated using (exists (select 1 from public.group_buys where id = group_buy_id and owner_id = (select auth.uid()))) with check (exists (select 1 from public.group_buys where id = group_buy_id and owner_id = (select auth.uid())));
create policy "Buyers and owners read group buy order items" on public.group_buy_order_items for select to authenticated using (exists (select 1 from public.group_buy_orders join public.group_buys on group_buys.id = group_buy_orders.group_buy_id where group_buy_orders.id = order_id and (group_buy_orders.buyer_id = (select auth.uid()) or group_buys.owner_id = (select auth.uid()))));
create policy "Buyers add their group buy order items" on public.group_buy_order_items for insert to authenticated with check (exists (select 1 from public.group_buy_orders where id = order_id and buyer_id = (select auth.uid())));
create trigger group_buy_orders_touch_updated_at before update on public.group_buy_orders for each row execute function public.touch_group_buy_updated_at();
