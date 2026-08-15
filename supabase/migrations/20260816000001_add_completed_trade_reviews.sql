-- A review is a verified buyer's assessment of the seller after the buyer has
-- completed a trade.  Direct writes stay disabled: the RPC below checks the
-- completed offer, its buyer, and its seller in one transaction.
alter table public.market_seller_ratings
  alter column score type numeric(2, 1) using score::numeric(2, 1),
  add column if not exists offer_id uuid references public.market_trade_offers(id) on delete cascade,
  add column if not exists comment text;

alter table public.market_seller_ratings
  drop constraint if exists market_seller_ratings_score_check,
  add constraint market_seller_ratings_score_check
    check (score >= 0.5 and score <= 5 and score * 2 = trunc(score * 2)),
  add constraint market_seller_ratings_comment_check
    check (comment is not null and char_length(trim(comment)) between 1 and 1000);

create unique index if not exists market_seller_ratings_offer_idx
  on public.market_seller_ratings (offer_id)
  where offer_id is not null;

create index if not exists market_seller_ratings_seller_review_idx
  on public.market_seller_ratings (seller_id, created_at desc);

grant select on table public.market_seller_ratings to anon, authenticated;

create policy "Completed trade reviews are readable"
on public.market_seller_ratings for select to anon, authenticated
using (true);

-- A completed sale can be the seller's only listing, so their profile and
-- avatar must remain visible while its verified reviews are visible.
drop policy if exists "Published seller profiles are readable" on public.market_seller_profiles;
create policy "Marketplace seller profiles are readable" on public.market_seller_profiles
for select to anon, authenticated
using (
  exists (
    select 1
    from public.market_listings
    where market_listings.owner_id = market_seller_profiles.id
      and market_listings.status in ('published', 'pending', 'sold')
  )
  or exists (
    select 1
    from public.market_seller_ratings
    where market_seller_ratings.seller_id = market_seller_profiles.id
  )
);

drop policy if exists "Published seller avatars are readable" on storage.objects;
create policy "Marketplace seller avatars are readable" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'profile-avatars'
  and exists (
    select 1
    from public.market_seller_profiles
    where market_seller_profiles.avatar_path = storage.objects.name
  )
);

-- A reviewer only becomes publicly identifiable through their name/avatar
-- after they publish a verified review.
drop policy if exists "Commenter profiles are readable" on public.market_comment_profiles;
create policy "Commenter and reviewer profiles are readable"
on public.market_comment_profiles for select to anon, authenticated
using (
  exists (
    select 1
    from public.market_listing_comments
    where market_listing_comments.author_id = market_comment_profiles.id
  )
  or exists (
    select 1
    from public.market_seller_ratings
    where market_seller_ratings.rater_id = market_comment_profiles.id
  )
);

drop policy if exists "Commenter avatars are readable" on storage.objects;
create policy "Commenter and reviewer avatars are readable" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'profile-avatars'
  and (
    exists (
      select 1
      from public.market_comment_profiles
      join public.market_listing_comments on market_listing_comments.author_id = market_comment_profiles.id
      where market_comment_profiles.avatar_path = storage.objects.name
    )
    or exists (
      select 1
      from public.market_comment_profiles
      join public.market_seller_ratings on market_seller_ratings.rater_id = market_comment_profiles.id
      where market_comment_profiles.avatar_path = storage.objects.name
    )
  )
);

create or replace function public.submit_market_trade_review(
  p_offer_id uuid,
  p_score numeric,
  p_comment text
)
returns public.market_seller_ratings
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  offer public.market_trade_offers;
  review public.market_seller_ratings;
  normalized_comment text := trim(coalesce(p_comment, ''));
begin
  if current_user_id is null then
    raise exception 'You must be signed in to leave a review.';
  end if;

  if p_score is null or p_score < 0.5 or p_score > 5 or p_score * 2 <> trunc(p_score * 2) then
    raise exception 'Choose a rating from 0.5 to 5 in half-star steps.';
  end if;

  if char_length(normalized_comment) < 1 or char_length(normalized_comment) > 1000 then
    raise exception 'Write a review between 1 and 1000 characters.';
  end if;

  select * into offer
  from public.market_trade_offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception 'Trade not found.';
  end if;

  if offer.buyer_id <> current_user_id then
    raise exception 'Only the buyer can review this seller.';
  end if;

  if offer.status <> 'completed' then
    raise exception 'You can review the seller once the trade is complete.';
  end if;

  insert into public.market_seller_ratings (offer_id, seller_id, rater_id, listing_id, score, comment)
  values (offer.id, offer.seller_id, current_user_id, offer.listing_id, p_score, normalized_comment)
  returning * into review;

  return review;
end;
$$;

revoke all on function public.submit_market_trade_review(uuid, numeric, text) from public, anon;
grant execute on function public.submit_market_trade_review(uuid, numeric, text) to authenticated;
