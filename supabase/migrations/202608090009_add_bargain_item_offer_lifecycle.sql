alter table public.bargain_listing_items
  add column if not exists status text not null default 'available'
  check (status in ('available', 'sold'));

create index if not exists bargain_listing_items_status_idx
  on public.bargain_listing_items (listing_id, status, display_order);

grant update on public.bargain_item_reservations to authenticated;

create policy "Sellers can respond to bargain reservation offers"
on public.bargain_item_reservations for update to authenticated
using (seller_id = (select auth.uid()) and status = 'pending')
with check (
  seller_id = (select auth.uid())
  and buyer_id <> seller_id
  and status in ('accepted', 'declined')
);
