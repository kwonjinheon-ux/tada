revoke update on table public.market_listing_comments from authenticated;
grant update (body, updated_at, deleted_at) on table public.market_listing_comments to authenticated;
