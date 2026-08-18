-- $2 Dollar Shop listings do not have inventory rows, so their fixed-price
-- purchase offers are kept separate from item reservations.
create table public.bargain_listing_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.bargain_listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);

create index bargain_listing_offers_listing_idx on public.bargain_listing_offers (listing_id, status, created_at desc);
create index bargain_listing_offers_seller_idx on public.bargain_listing_offers (seller_id, status, created_at desc);
create unique index bargain_listing_offers_one_pending_offer_idx
  on public.bargain_listing_offers (listing_id, buyer_id)
  where status = 'pending';

grant select, insert, update on public.bargain_listing_offers to authenticated;

alter table public.bargain_listing_offers enable row level security;

create policy "Bargain listing offer parties can read offers"
on public.bargain_listing_offers for select to authenticated
using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));

create policy "Buyers can offer on published single-item bargains"
on public.bargain_listing_offers for insert to authenticated
with check (
  buyer_id = (select auth.uid())
  and buyer_id <> seller_id
  and exists (
    select 1
    from public.bargain_listings listing
    where listing.id = bargain_listing_offers.listing_id
      and listing.owner_id = bargain_listing_offers.seller_id
      and listing.bargain_type = '2-dollar-deals'
      and listing.status in ('published', 'pending')
  )
);

create policy "Sellers can respond to bargain listing offers"
on public.bargain_listing_offers for update to authenticated
using (seller_id = (select auth.uid()) and status = 'pending')
with check (
  seller_id = (select auth.uid())
  and buyer_id <> seller_id
  and status in ('accepted', 'declined')
);

create or replace function public.touch_bargain_listing_offers_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger bargain_listing_offers_touch_updated_at
before update on public.bargain_listing_offers
for each row execute function public.touch_bargain_listing_offers_updated_at();
