do $$
begin
  if not exists (select 1 from pg_type where typname = 'market_trade_offer_status') then
    create type public.market_trade_offer_status as enum ('pending', 'accepted', 'declined', 'cancelled', 'completed');
  end if;
end $$;

alter table public.profiles
  add column if not exists trade_points_received integer not null default 0 check (trade_points_received >= 0),
  add column if not exists trade_points_given integer not null default 0 check (trade_points_given >= 0);

create table public.market_trade_offers (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.market_conversations(id) on delete cascade,
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  note text check (note is null or char_length(trim(note)) <= 500),
  status public.market_trade_offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  check (buyer_id <> seller_id)
);

create index market_trade_offers_conversation_idx
  on public.market_trade_offers (conversation_id, created_at desc);

create unique index market_trade_offers_one_active_idx
  on public.market_trade_offers (conversation_id)
  where status in ('pending', 'accepted');

create table public.market_trade_points (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.market_trade_offers(id) on delete cascade,
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  giver_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null default 10 check (points > 0 and points <= 10),
  reason text not null default 'completed_trade',
  created_at timestamptz not null default now(),
  check (giver_id <> receiver_id),
  unique (offer_id, giver_id, receiver_id)
);

create index market_trade_points_receiver_idx
  on public.market_trade_points (receiver_id, created_at desc);

alter table public.market_trade_offers enable row level security;
alter table public.market_trade_points enable row level security;

grant select, insert on table public.market_trade_offers to authenticated;
grant select on table public.market_trade_points to authenticated;

create policy "Trade conversation participants can read listings"
on public.market_listings for select to authenticated
using (
  exists (
    select 1
    from public.market_conversations
    where market_conversations.listing_id = market_listings.id
      and (select auth.uid()) in (market_conversations.buyer_id, market_conversations.seller_id)
  )
);

create policy "Trade conversation participants can read listing photos"
on public.market_listing_photos for select to authenticated
using (
  exists (
    select 1
    from public.market_conversations
    where market_conversations.listing_id = market_listing_photos.listing_id
      and (select auth.uid()) in (market_conversations.buyer_id, market_conversations.seller_id)
  )
);

create policy "Trade participants can read offers"
on public.market_trade_offers for select to authenticated
using ((select auth.uid()) in (buyer_id, seller_id));

create policy "Buyers can make trade offers"
on public.market_trade_offers for insert to authenticated
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
      and market_listings.status = 'published'
  )
);

create policy "Trade participants can read points"
on public.market_trade_points for select to authenticated
using ((select auth.uid()) in (giver_id, receiver_id));

create or replace function public.refresh_market_trade_point_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_user_ids uuid[];
begin
  affected_user_ids := array_remove(array[
    coalesce(new.giver_id, old.giver_id),
    coalesce(new.receiver_id, old.receiver_id)
  ], null);

  update public.profiles
  set
    trade_points_given = coalesce((
      select sum(points)::integer
      from public.market_trade_points
      where giver_id = profiles.id
    ), 0),
    trade_points_received = coalesce((
      select sum(points)::integer
      from public.market_trade_points
      where receiver_id = profiles.id
    ), 0),
    updated_at = now()
  where id = any(affected_user_ids);

  return coalesce(new, old);
end;
$$;

revoke all on function public.refresh_market_trade_point_summary() from public;

create trigger market_trade_points_refresh_summary
after insert or update or delete on public.market_trade_points
for each row execute function public.refresh_market_trade_point_summary();

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
      and status = 'published';

    message_body := 'Offer accepted. Please meet safely, check the item, then confirm the trade to award points to both members.';
  elsif p_action = 'decline' then
    update public.market_trade_offers
    set status = 'declined', responded_at = now(), updated_at = now()
    where id = p_offer_id
    returning * into offer;

    message_body := 'Offer declined.';
  else
    raise exception 'Unsupported offer action.';
  end if;

  insert into public.market_messages (conversation_id, sender_id, recipient_id, body)
  values (offer.conversation_id, current_user_id, current_user_id, message_body);

  return offer;
end;
$$;

revoke all on function public.respond_market_trade_offer(uuid, text) from public;
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

  insert into public.market_messages (conversation_id, sender_id, recipient_id, body)
  values (offer.conversation_id, current_user_id, current_user_id, 'Offer cancelled.');

  return offer;
end;
$$;

revoke all on function public.cancel_market_trade_offer(uuid) from public;
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
  set status = 'sold', updated_at = now()
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

revoke all on function public.complete_market_trade_offer(uuid) from public;
grant execute on function public.complete_market_trade_offer(uuid) to authenticated;
