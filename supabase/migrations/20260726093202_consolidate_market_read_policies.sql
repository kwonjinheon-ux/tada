drop policy if exists "Market listings are readable while visible" on public.market_listings;
drop policy if exists "Trade conversation participants can read listings" on public.market_listings;
drop policy if exists "Wishlisted market listings are readable" on public.market_listings;

create policy "Visible market listings are publicly readable"
on public.market_listings
for select to anon
using (status in ('published', 'pending', 'sold'));

create policy "Authenticated members read permitted market listings"
on public.market_listings
for select to authenticated
using (
  status in ('published', 'pending', 'sold')
  or owner_id = (select auth.uid())
  or exists (
    select 1
    from public.market_wishlist
    where market_wishlist.listing_id = market_listings.id
      and market_wishlist.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.market_conversations
    where market_conversations.listing_id = market_listings.id
      and (select auth.uid()) in (
        market_conversations.buyer_id,
        market_conversations.seller_id
      )
  )
);

drop policy if exists "Visible market listing photos are readable" on public.market_listing_photos;
drop policy if exists "Trade conversation participants can read listing photos" on public.market_listing_photos;
drop policy if exists "Wishlisted market listing photos are readable" on public.market_listing_photos;

create policy "Visible market listing photos are publicly readable"
on public.market_listing_photos
for select to anon
using (
  exists (
    select 1
    from public.market_listings
    where market_listings.id = market_listing_photos.listing_id
      and market_listings.status in ('published', 'pending', 'sold')
  )
);

create policy "Authenticated members read permitted market listing photos"
on public.market_listing_photos
for select to authenticated
using (
  exists (
    select 1
    from public.market_listings
    where market_listings.id = market_listing_photos.listing_id
      and (
        market_listings.status in ('published', 'pending', 'sold')
        or market_listings.owner_id = (select auth.uid())
      )
  )
  or exists (
    select 1
    from public.market_wishlist
    where market_wishlist.listing_id = market_listing_photos.listing_id
      and market_wishlist.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.market_conversations
    where market_conversations.listing_id = market_listing_photos.listing_id
      and (select auth.uid()) in (
        market_conversations.buyer_id,
        market_conversations.seller_id
      )
  )
);
