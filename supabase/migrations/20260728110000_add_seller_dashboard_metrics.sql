create or replace function public.get_market_seller_dashboard_metrics()
returns table (total_views bigint, total_saves bigint, total_sales bigint)
language sql
security definer
set search_path = ''
as $$
  select
    coalesce(sum(listing.view_count), 0)::bigint as total_views,
    (
      select count(*)::bigint
      from public.market_wishlist wishlist
      join public.market_listings saved_listing on saved_listing.id = wishlist.listing_id
      where saved_listing.owner_id = auth.uid()
    ) as total_saves,
    (
      select count(*)::bigint
      from public.market_trade_offers offer
      where offer.seller_id = auth.uid()
        and offer.status = 'completed'
    ) as total_sales
  from public.market_listings listing
  where listing.owner_id = auth.uid();
$$;

revoke all on function public.get_market_seller_dashboard_metrics() from public, anon;
grant execute on function public.get_market_seller_dashboard_metrics() to authenticated;
