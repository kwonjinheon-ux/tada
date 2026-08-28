create type public.group_buy_status as enum ('open', 'closed', 'cancelled');

create table public.group_buys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 4 and 100),
  summary text not null check (char_length(trim(summary)) between 4 and 140),
  description text not null check (char_length(trim(description)) between 20 and 5000),
  reference_prefix text not null check (reference_prefix ~ '^[A-Z]{2,4}$'),
  closes_at timestamptz not null,
  handover_at timestamptz not null,
  pickup_available boolean not null default true,
  pickup_address text,
  pickup_window text,
  pickup_note text,
  delivery_available boolean not null default false,
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  delivery_free_over_cents integer check (delivery_free_over_cents is null or delivery_free_over_cents >= 0),
  delivery_areas text[] not null default '{}'::text[],
  bank_account_name text not null check (char_length(trim(bank_account_name)) between 2 and 120),
  bank_account_number text not null check (char_length(trim(bank_account_number)) between 5 and 80),
  minimum_order_cents integer check (minimum_order_cents is null or minimum_order_cents >= 0),
  status public.group_buy_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (handover_at > closes_at),
  check (pickup_available or delivery_available),
  check (not pickup_available or (pickup_address is not null and pickup_window is not null))
);

create table public.group_buy_items (
  id uuid primary key default gen_random_uuid(),
  group_buy_id uuid not null references public.group_buys(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  note text not null default '' check (char_length(note) <= 280),
  price_cents integer not null check (price_cents > 0 and price_cents <= 100000000),
  unit_label text not null check (char_length(trim(unit_label)) between 1 and 40),
  limit_per_person integer check (limit_per_person is null or limit_per_person between 1 and 1000),
  photo_path text,
  photo_alt text,
  display_order integer not null check (display_order >= 0),
  created_at timestamptz not null default now(),
  unique (group_buy_id, display_order)
);

create index group_buys_open_idx on public.group_buys (status, closes_at, created_at desc);
create index group_buys_owner_idx on public.group_buys (owner_id, created_at desc);
create index group_buy_items_group_buy_idx on public.group_buy_items (group_buy_id, display_order);

alter table public.group_buys enable row level security;
alter table public.group_buy_items enable row level security;
grant select on public.group_buys, public.group_buy_items to anon, authenticated;
grant insert, update, delete on public.group_buys, public.group_buy_items to authenticated;

create policy "Open group buys are readable" on public.group_buys
for select to anon, authenticated
using (status = 'open' or owner_id = (select auth.uid()));

create policy "Owners create group buys" on public.group_buys
for insert to authenticated with check (owner_id = (select auth.uid()));

create policy "Owners manage group buys" on public.group_buys
for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "Owners delete group buys" on public.group_buys
for delete to authenticated using (owner_id = (select auth.uid()));

create policy "Items of readable group buys are readable" on public.group_buy_items
for select to anon, authenticated
using (exists (select 1 from public.group_buys where group_buys.id = group_buy_items.group_buy_id and (group_buys.status = 'open' or group_buys.owner_id = (select auth.uid()))));

create policy "Owners manage group buy items" on public.group_buy_items
for all to authenticated
using (exists (select 1 from public.group_buys where group_buys.id = group_buy_items.group_buy_id and group_buys.owner_id = (select auth.uid())))
with check (exists (select 1 from public.group_buys where group_buys.id = group_buy_items.group_buy_id and group_buys.owner_id = (select auth.uid())));

create or replace function public.touch_group_buy_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger group_buys_touch_updated_at before update on public.group_buys
for each row execute function public.touch_group_buy_updated_at();

insert into storage.buckets (id, name, public) values ('group-buy-images', 'group-buy-images', false)
on conflict (id) do nothing;

create policy "Owners upload group buy images" on storage.objects
for insert to authenticated with check (bucket_id = 'group-buy-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners update group buy images" on storage.objects
for update to authenticated using (bucket_id = 'group-buy-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'group-buy-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Group buy images are readable" on storage.objects
for select to anon, authenticated using (bucket_id = 'group-buy-images');
