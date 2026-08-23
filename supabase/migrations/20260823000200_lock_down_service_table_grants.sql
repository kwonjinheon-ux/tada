-- These tables are exposed through the Data API. Keep public visitors
-- read-only and give write access only to signed-in users; RLS then limits
-- each write to the listing owner.
revoke all on table public.service_listings, public.service_listing_photos from anon, authenticated;

grant select on table public.service_listings, public.service_listing_photos to anon, authenticated;
grant insert, update, delete on table public.service_listings, public.service_listing_photos to authenticated;
