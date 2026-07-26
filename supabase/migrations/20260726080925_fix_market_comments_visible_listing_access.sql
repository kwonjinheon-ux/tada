grant select on table public.market_listing_comments to anon, authenticated;

drop policy if exists "Members can comment on published listings" on public.market_listing_comments;
drop policy if exists "Members can comment on active visible listings" on public.market_listing_comments;

create policy "Members can comment on active visible listings"
on public.market_listing_comments
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.market_listings
    where market_listings.id = market_listing_comments.listing_id
      and market_listings.status in ('published', 'pending')
  )
);
