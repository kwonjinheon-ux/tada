create or replace function public.validate_market_conversation_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  listing_owner_id uuid;
  listing_status public.market_listing_status;
begin
  if current_user_id is null or new.buyer_id <> current_user_id then
    raise exception 'The signed-in buyer must own the conversation.';
  end if;

  select owner_id, status
  into listing_owner_id, listing_status
  from public.market_listings
  where id = new.listing_id;

  if not found or listing_status not in ('published', 'pending') then
    raise exception 'This listing is not available for conversations.';
  end if;

  if new.seller_id <> listing_owner_id or new.seller_id = current_user_id then
    raise exception 'The conversation seller must own the listing.';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_market_conversation_insert() from public, anon, authenticated;

drop policy if exists "Buyers can make trade offers"
on public.market_trade_offers;

create policy "Buyers can make trade offers"
on public.market_trade_offers
for insert
to authenticated
with check (
  buyer_id = (select auth.uid())
  and exists (
    select 1
    from public.market_conversations
    join public.market_listings on market_listings.id = market_conversations.listing_id
    where market_conversations.id = market_trade_offers.conversation_id
      and market_conversations.listing_id = market_trade_offers.listing_id
      and market_conversations.buyer_id = market_trade_offers.buyer_id
      and market_conversations.seller_id = market_trade_offers.seller_id
      and market_listings.owner_id = market_trade_offers.seller_id
      and market_listings.status in ('published', 'pending')
  )
);

create or replace function public.respond_market_trade_offer(p_offer_id uuid, p_action text)
returns public.market_trade_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  offer public.market_trade_offers;
  listing_status public.market_listing_status;
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

  select status into listing_status
  from public.market_listings
  where id = offer.listing_id
    and owner_id = current_user_id
  for update;

  if not found or listing_status not in ('published', 'pending') then
    raise exception 'This listing is no longer accepting offers.';
  end if;

  if p_action = 'accept' then
    update public.market_trade_offers
    set
      status = 'declined',
      responded_at = now(),
      updated_at = now()
    where listing_id = offer.listing_id
      and id <> p_offer_id
      and status in ('pending', 'accepted');

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
