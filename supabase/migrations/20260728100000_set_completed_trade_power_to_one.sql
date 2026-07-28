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
    (offer.id, offer.listing_id, offer.buyer_id, offer.seller_id, 1),
    (offer.id, offer.listing_id, offer.seller_id, offer.buyer_id, 1)
  on conflict (offer_id, giver_id, receiver_id) do nothing;

  insert into public.market_messages (conversation_id, sender_id, recipient_id, body)
  values (offer.conversation_id, current_user_id, current_user_id, 'Trade completed. Both members received 1 trust point.');

  return offer;
end;
$$;

revoke execute on function public.complete_market_trade_offer(uuid) from public, anon;
grant execute on function public.complete_market_trade_offer(uuid) to authenticated;
