-- Visitors who are not signed in could no longer read seller profiles, and with
-- them could no longer sign any storage image. Fixes the policy added in
-- 20261024000100_expand_profile_visibility.sql.
--
-- What went wrong
-- ---------------
-- That migration replaced the seller-profile read policy with one that, for the
-- "interested users" and "trade partners" choices, looks inside market_wishlist,
-- market_conversations, market_trade_offers and bargain_item_reservations. The
-- policy was written `to anon, authenticated`, but `anon` has no privilege on
-- any of those four tables.
--
-- Postgres checks table privileges for every relation in the query it plans,
-- and the planner folds every policy that applies to the role into that query.
-- It does not matter that an anonymous visitor could never reach those branches:
-- the privilege check fails first, with
--
--     permission denied for table market_wishlist
--
-- and the whole read is refused. Two things read seller profiles as `anon`:
--
--   * the seller card, directly, and
--   * every signed storage URL, indirectly: "Marketplace seller avatars are
--     readable" on storage.objects asks market_seller_profiles for the avatar.
--     Policies on a table are OR-ed into one plan, so that policy rides along
--     when ANY object is signed, whatever its bucket. The app signs all of its
--     images with the public key, so every image failed to sign.
--
-- Signed URLs that were already in the server's 24-hour cache kept working,
-- which is why pages looked fine at first. Everything else retried a failing
-- call per image on every request, and failing calls pile up badly: ten in
-- parallel took 0.8s, forty took 10.5s. Once the cache expired, images were
-- going to disappear from every page.
--
-- The fix
-- -------
-- Split the policy by role. Policies are filtered by the current role before
-- the plan is built, so the branches that need those four tables now exist only
-- for signed-in members, who are allowed to read them. A visitor gets the rule
-- that applies to a visitor and nothing else:
--
--   visitors  - a published seller whose profile is set to public
--   members   - the full five-way rule, unchanged
--
-- Nothing a signed-in member could see before changes.
--
-- Not changed here, because it is a product decision rather than a bug:
-- "Marketplace seller profiles are readable" from 20260816000001 is still in
-- force and is OR-ed with the policies below. It has no visibility check, so a
-- seller who chooses "private" is still readable through it. Dropping it would
-- enforce the setting, and would also hide sellers who have only sold or
-- pending listings, or only ratings, from a visitor.

drop policy if exists "Published seller profiles respect visibility" on public.market_seller_profiles;
drop policy if exists "Published seller profiles are public for visitors" on public.market_seller_profiles;
drop policy if exists "Published seller profiles respect visibility for members" on public.market_seller_profiles;

create policy "Published seller profiles are public for visitors"
on public.market_seller_profiles for select to anon
using (
  profile_visibility = 'public'
  and exists (
    select 1
    from public.market_listings listing
    where listing.owner_id = market_seller_profiles.id
      and listing.status = 'published'
  )
);

create policy "Published seller profiles respect visibility for members"
on public.market_seller_profiles for select to authenticated
using (
  exists (select 1 from public.market_listings listing where listing.owner_id = market_seller_profiles.id and listing.status = 'published')
  and (
    profile_visibility = 'public'
    or (profile_visibility = 'members' and (select auth.uid()) is not null)
    or market_seller_profiles.id = (select auth.uid())
    or (profile_visibility = 'interested_users' and (
      exists (select 1 from public.market_wishlist wishlist join public.market_listings listing on listing.id = wishlist.listing_id where wishlist.user_id = (select auth.uid()) and listing.owner_id = market_seller_profiles.id and listing.status = 'published')
      or exists (select 1 from public.market_conversations conversation where ((conversation.buyer_id = (select auth.uid()) and conversation.seller_id = market_seller_profiles.id) or (conversation.seller_id = (select auth.uid()) and conversation.buyer_id = market_seller_profiles.id)))
    ))
    or (profile_visibility = 'trade_partners' and (
      exists (select 1 from public.market_trade_offers offer where offer.seller_id = market_seller_profiles.id and offer.buyer_id = (select auth.uid()) and offer.status = 'accepted')
      or exists (select 1 from public.market_trade_offers offer where offer.buyer_id = market_seller_profiles.id and offer.seller_id = (select auth.uid()) and offer.status = 'accepted')
      or exists (select 1 from public.bargain_item_reservations reservation where reservation.seller_id = market_seller_profiles.id and reservation.buyer_id = (select auth.uid()) and reservation.status in ('confirmed', 'on_the_way'))
      or exists (select 1 from public.bargain_item_reservations reservation where reservation.buyer_id = market_seller_profiles.id and reservation.seller_id = (select auth.uid()) and reservation.status in ('confirmed', 'on_the_way'))
    ))
  )
);
