-- Global administrators can audit and manage every marketplace listing.
create policy "Moderators can manage all market listings"
on public.market_listings for all to authenticated
using ((select public.market_is_moderator()))
with check ((select public.market_is_moderator()));

create policy "Moderators can read all market listing photos"
on public.market_listing_photos for select to authenticated
using ((select public.market_is_moderator()));
