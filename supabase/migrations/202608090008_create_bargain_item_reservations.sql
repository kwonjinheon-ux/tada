-- Keep bargain reservations independent from the Market offer and conversation
-- tables. A reservation is the buyer's immediate offer for one sale inventory
-- item and remains visible to both parties through RLS.
create table if not exists public.bargain_item_reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.bargain_listings(id) on delete cascade,
  item_id uuid not null references public.bargain_listing_items(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);

create index if not exists bargain_item_reservations_seller_idx on public.bargain_item_reservations (seller_id, status, created_at desc);
create index if not exists bargain_item_reservations_buyer_idx on public.bargain_item_reservations (buyer_id, status, created_at desc);
create unique index if not exists bargain_item_reservations_one_pending_offer_idx
  on public.bargain_item_reservations (item_id, buyer_id)
  where status = 'pending';

grant select, insert on public.bargain_item_reservations to authenticated;

alter table public.bargain_item_reservations enable row level security;

create policy "Bargain reservation parties can read their offers"
on public.bargain_item_reservations for select to authenticated
using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));

create policy "Buyers can reserve published bargain sale items"
on public.bargain_item_reservations for insert to authenticated
with check (
  buyer_id = (select auth.uid())
  and buyer_id <> seller_id
  and exists (
    select 1
    from public.bargain_listing_items item
    join public.bargain_listings listing on listing.id = item.listing_id
    where item.id = bargain_item_reservations.item_id
      and item.listing_id = bargain_item_reservations.listing_id
      and item.owner_id = bargain_item_reservations.seller_id
      and listing.owner_id = bargain_item_reservations.seller_id
      and listing.status in ('published', 'pending')
  )
);

create or replace function public.touch_bargain_item_reservations_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger bargain_item_reservations_touch_updated_at
before update on public.bargain_item_reservations
for each row execute function public.touch_bargain_item_reservations_updated_at();
