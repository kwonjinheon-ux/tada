alter table public.market_listings
  add column if not exists sold_at timestamptz;

update public.market_listings
set sold_at = coalesce(sold_at, market_trade_offers.completed_at, market_listings.updated_at)
from public.market_trade_offers
where market_trade_offers.listing_id = market_listings.id
  and market_trade_offers.status = 'completed'
  and market_listings.status = 'sold'
  and market_listings.sold_at is null;

drop policy if exists "Published market listings are readable" on public.market_listings;
create policy "Market listings are readable while visible"
on public.market_listings for select to anon, authenticated
using (status in ('published', 'pending', 'sold') or owner_id = (select auth.uid()));

drop policy if exists "Published market listing photos are readable" on public.market_listing_photos;
create policy "Visible market listing photos are readable"
on public.market_listing_photos for select to anon, authenticated
using (
  exists (
    select 1
    from public.market_listings
    where market_listings.id = market_listing_photos.listing_id
      and (market_listings.status in ('published', 'pending', 'sold') or market_listings.owner_id = (select auth.uid()))
  )
);

drop policy if exists "Users update own market listings" on public.market_listings;
create policy "Users update editable own market listings"
on public.market_listings for update to authenticated
using (owner_id = (select auth.uid()) and status <> 'sold')
with check (owner_id = (select auth.uid()) and status <> 'sold');

drop policy if exists "Users delete own market listings" on public.market_listings;
create policy "Users delete own market listings after sale hold"
on public.market_listings for delete to authenticated
using (
  owner_id = (select auth.uid())
  and (
    status <> 'sold'
    or (sold_at is not null and sold_at <= now() - interval '30 days')
  )
);

create or replace function public.mark_listing_pending_for_market_trade_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.market_listings
  set status = 'pending', updated_at = now()
  where id = new.listing_id
    and owner_id = new.seller_id
    and status = 'published';

  return new;
end;
$$;

revoke execute on function public.mark_listing_pending_for_market_trade_offer() from public, anon, authenticated;

drop trigger if exists market_trade_offers_mark_listing_pending on public.market_trade_offers;
create trigger market_trade_offers_mark_listing_pending
after insert on public.market_trade_offers
for each row execute function public.mark_listing_pending_for_market_trade_offer();

create or replace function public.release_listing_if_no_active_trade_offer(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.market_listings
  set status = 'published', updated_at = now()
  where id = p_listing_id
    and status = 'pending'
    and not exists (
      select 1
      from public.market_trade_offers
      where listing_id = p_listing_id
        and status in ('pending', 'accepted')
    );
end;
$$;

revoke execute on function public.release_listing_if_no_active_trade_offer(uuid) from public, anon, authenticated;

create or replace function public.respond_market_trade_offer(p_offer_id uuid, p_action text)
returns public.market_trade_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  offer public.market_trade_offers;
  message_body text;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to respond to an offer.';
  end if;

  select * into offer
  from public.market_trade_offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception 'Offer not found.';
  end if;

  if offer.seller_id <> current_user_id then
    raise exception 'Only the seller can respond to this offer.';
  end if;

  if offer.status <> 'pending' then
    raise exception 'This offer is no longer pending.';
  end if;

  if p_action = 'accept' then
    update public.market_trade_offers
    set status = 'accepted', responded_at = now(), updated_at = now()
    where id = p_offer_id
    returning * into offer;

    update public.market_listings
    set status = 'pending', updated_at = now()
    where id = offer.listing_id
      and owner_id = current_user_id
      and status in ('published', 'pending');

    message_body := 'Offer accepted. Please meet safely, check the item, then confirm the trade to award points to both members.';
  elsif p_action = 'decline' then
    update public.market_trade_offers
    set status = 'declined', responded_at = now(), updated_at = now()
    where id = p_offer_id
    returning * into offer;

    perform public.release_listing_if_no_active_trade_offer(offer.listing_id);
    message_body := 'Offer declined.';
  else
    raise exception 'Unsupported offer action.';
  end if;

  insert into public.market_messages (conversation_id, sender_id, recipient_id, body)
  values (offer.conversation_id, current_user_id, current_user_id, message_body);

  return offer;
end;
$$;

revoke execute on function public.respond_market_trade_offer(uuid, text) from public, anon;
grant execute on function public.respond_market_trade_offer(uuid, text) to authenticated;

create or replace function public.cancel_market_trade_offer(p_offer_id uuid)
returns public.market_trade_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  offer public.market_trade_offers;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to cancel an offer.';
  end if;

  select * into offer
  from public.market_trade_offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception 'Offer not found.';
  end if;

  if offer.buyer_id <> current_user_id then
    raise exception 'Only the buyer can cancel this offer.';
  end if;

  if offer.status <> 'pending' then
    raise exception 'Only pending offers can be cancelled.';
  end if;

  update public.market_trade_offers
  set status = 'cancelled', updated_at = now()
  where id = p_offer_id
  returning * into offer;

  perform public.release_listing_if_no_active_trade_offer(offer.listing_id);

  insert into public.market_messages (conversation_id, sender_id, recipient_id, body)
  values (offer.conversation_id, current_user_id, current_user_id, 'Offer cancelled.');

  return offer;
end;
$$;

revoke execute on function public.cancel_market_trade_offer(uuid) from public, anon;
grant execute on function public.cancel_market_trade_offer(uuid) to authenticated;

create or replace function public.complete_market_trade_offer(p_offer_id uuid)
returns public.market_trade_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  offer public.market_trade_offers;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to complete a trade.';
  end if;

  select * into offer
  from public.market_trade_offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception 'Offer not found.';
  end if;

  if offer.buyer_id <> current_user_id then
    raise exception 'Only the buyer can confirm this trade.';
  end if;

  if offer.status <> 'accepted' then
    raise exception 'Only accepted offers can be completed.';
  end if;

  update public.market_trade_offers
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = p_offer_id
  returning * into offer;

  update public.market_listings
  set status = 'sold', sold_at = now(), updated_at = now()
  where id = offer.listing_id
    and owner_id = offer.seller_id
    and status in ('published', 'pending');

  insert into public.market_trade_points (offer_id, listing_id, giver_id, receiver_id, points)
  values
    (offer.id, offer.listing_id, offer.buyer_id, offer.seller_id, 10),
    (offer.id, offer.listing_id, offer.seller_id, offer.buyer_id, 10)
  on conflict (offer_id, giver_id, receiver_id) do nothing;

  insert into public.market_messages (conversation_id, sender_id, recipient_id, body)
  values (offer.conversation_id, current_user_id, current_user_id, 'Trade completed. Both members received 10 trust points.');

  return offer;
end;
$$;

revoke execute on function public.complete_market_trade_offer(uuid) from public, anon;
grant execute on function public.complete_market_trade_offer(uuid) to authenticated;
