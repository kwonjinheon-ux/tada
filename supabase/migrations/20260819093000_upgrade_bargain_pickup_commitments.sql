-- A Garage / Moving Sale reservation is a time-bound pickup commitment, not a
-- completed purchase.  The function below owns all state transitions so an
-- item cannot be simultaneously confirmed for two buyers.

alter table public.bargain_item_reservations
  add column if not exists pickup_start_at timestamptz,
  add column if not exists pickup_end_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists seller_note text check (seller_note is null or char_length(seller_note) <= 500);

alter table public.bargain_item_reservations
  drop constraint if exists bargain_item_reservations_status_check;

update public.bargain_item_reservations
set status = case status
  when 'pending' then 'requested'
  -- Before this migration accepting an offer immediately sold the item, so
  -- those historical rows are completed transactions rather than active holds.
  when 'accepted' then 'picked_up'
  when 'completed' then 'picked_up'
  else status
end;

alter table public.bargain_item_reservations
  alter column status set default 'requested';

alter table public.bargain_item_reservations
  add constraint bargain_item_reservations_status_check
  check (status in ('requested', 'confirmed', 'on_the_way', 'picked_up', 'declined', 'cancelled', 'expired', 'no_show'));

alter table public.bargain_listing_items
  drop constraint if exists bargain_listing_items_status_check;

alter table public.bargain_listing_items
  add constraint bargain_listing_items_status_check
  check (status in ('available', 'reserved', 'sold'));

create index if not exists bargain_item_reservations_item_active_idx
  on public.bargain_item_reservations (item_id, expires_at)
  where status in ('confirmed', 'on_the_way');

drop index if exists public.bargain_item_reservations_one_pending_offer_idx;
create unique index if not exists bargain_item_reservations_one_requested_pickup_idx
  on public.bargain_item_reservations (item_id, buyer_id)
  where status = 'requested';

-- Direct client updates would allow a buyer or seller to jump through the
-- lifecycle. Keep reads under RLS, but perform the guarded transitions here.
drop policy if exists "Sellers can respond to bargain reservation offers" on public.bargain_item_reservations;
revoke update on public.bargain_item_reservations from authenticated;

create or replace function public.manage_bargain_pickup_reservation(
  p_action text,
  p_listing_id uuid default null,
  p_item_id uuid default null,
  p_reservation_id uuid default null,
  p_pickup_start_at timestamptz default null,
  p_pickup_end_at timestamptz default null
)
returns public.bargain_item_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_listing public.bargain_listings%rowtype;
  v_item public.bargain_listing_items%rowtype;
  v_reservation public.bargain_item_reservations%rowtype;
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'Please log in to manage pickup commitments.';
  end if;

  if p_action = 'request' then
    if p_listing_id is null or p_item_id is null or p_pickup_start_at is null or p_pickup_end_at is null then
      raise exception using errcode = '22023', message = 'A sale item and pickup time are required.';
    end if;
    if p_pickup_start_at < now() or p_pickup_end_at <> p_pickup_start_at + interval '30 minutes' then
      raise exception using errcode = '22023', message = 'Choose a future 30-minute pickup time.';
    end if;

    select * into v_listing from public.bargain_listings where id = p_listing_id for update;
    if not found or v_listing.status not in ('published', 'pending') or v_listing.bargain_type not in ('garage-sale', 'moving-sale') then
      raise exception using errcode = 'P0002', message = 'This sale is not accepting pickup commitments.';
    end if;
    if v_listing.owner_id = v_actor_id then
      raise exception using errcode = '42501', message = 'You cannot reserve your own item.';
    end if;

    select * into v_item from public.bargain_listing_items where id = p_item_id and listing_id = p_listing_id for update;
    if not found or v_item.owner_id <> v_listing.owner_id then
      raise exception using errcode = 'P0002', message = 'This sale item is no longer available.';
    end if;

    update public.bargain_item_reservations
      set status = 'expired'
      where item_id = v_item.id
        and status in ('confirmed', 'on_the_way')
        and expires_at <= now();

    update public.bargain_listing_items
      set status = 'available'
      where id = v_item.id and status = 'reserved'
        and not exists (
          select 1 from public.bargain_item_reservations
          where item_id = v_item.id and status in ('confirmed', 'on_the_way') and expires_at > now()
        );
    select * into v_item from public.bargain_listing_items where id = p_item_id for update;

    select * into v_reservation from public.bargain_item_reservations
      where item_id = v_item.id and buyer_id = v_actor_id
        and status in ('requested', 'confirmed', 'on_the_way')
      order by created_at desc limit 1;
    if found then
      return v_reservation;
    end if;
    if v_item.status <> 'available' then
      raise exception using errcode = '23505', message = 'This item is currently held for another pickup.';
    end if;

    insert into public.bargain_item_reservations (
      listing_id, item_id, buyer_id, seller_id, amount_cents, status, pickup_start_at, pickup_end_at
    ) values (
      v_listing.id, v_item.id, v_actor_id, v_listing.owner_id, v_item.price_cents, 'requested', p_pickup_start_at, p_pickup_end_at
    ) returning * into v_reservation;
    return v_reservation;
  end if;

  if p_reservation_id is null then
    raise exception using errcode = '22023', message = 'A pickup commitment is required.';
  end if;
  select * into v_reservation from public.bargain_item_reservations where id = p_reservation_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'This pickup commitment no longer exists.';
  end if;
  select * into v_item from public.bargain_listing_items where id = v_reservation.item_id for update;

  update public.bargain_item_reservations
    set status = 'expired'
    where item_id = v_item.id
      and status in ('confirmed', 'on_the_way')
      and expires_at <= now()
      and (p_reservation_id is null or id <> p_reservation_id);

  if p_action = 'accept' then
    update public.bargain_listing_items
      set status = 'available'
      where id = v_item.id and status = 'reserved'
        and not exists (
          select 1 from public.bargain_item_reservations
          where item_id = v_item.id and status in ('confirmed', 'on_the_way') and expires_at > now()
        );
    select * into v_item from public.bargain_listing_items where id = v_item.id for update;
  end if;

  select * into v_reservation from public.bargain_item_reservations where id = p_reservation_id for update;

  if p_action = 'accept' then
    if v_reservation.seller_id <> v_actor_id or v_reservation.status <> 'requested' then
      raise exception using errcode = '42501', message = 'Only the seller can confirm a pending pickup request.';
    end if;
    if v_item.status <> 'available' then
      raise exception using errcode = '23505', message = 'This item is no longer available to hold.';
    end if;
    update public.bargain_item_reservations set status = 'declined'
      where item_id = v_item.id and status = 'requested' and id <> v_reservation.id;
    update public.bargain_item_reservations set status = 'confirmed', expires_at = pickup_end_at
      where id = v_reservation.id returning * into v_reservation;
    update public.bargain_listing_items set status = 'reserved' where id = v_item.id;
    return v_reservation;
  end if;

  if p_action = 'decline' then
    if v_reservation.seller_id <> v_actor_id or v_reservation.status <> 'requested' then
      raise exception using errcode = '42501', message = 'Only the seller can decline a pending pickup request.';
    end if;
    update public.bargain_item_reservations set status = 'declined' where id = v_reservation.id returning * into v_reservation;
    return v_reservation;
  end if;

  if p_action = 'on_the_way' then
    if v_reservation.buyer_id <> v_actor_id or v_reservation.status <> 'confirmed' then
      raise exception using errcode = '42501', message = 'Only the buyer can confirm they are on the way.';
    end if;
    update public.bargain_item_reservations set status = 'on_the_way' where id = v_reservation.id returning * into v_reservation;
    return v_reservation;
  end if;

  if p_action = 'cancel' then
    if v_reservation.buyer_id <> v_actor_id or v_reservation.status not in ('requested', 'confirmed', 'on_the_way') then
      raise exception using errcode = '42501', message = 'This pickup commitment can no longer be cancelled.';
    end if;
    update public.bargain_item_reservations set status = 'cancelled' where id = v_reservation.id returning * into v_reservation;
    update public.bargain_listing_items set status = 'available' where id = v_item.id and status = 'reserved';
    return v_reservation;
  end if;

  if p_action = 'picked_up' then
    if v_reservation.seller_id <> v_actor_id or v_reservation.status not in ('confirmed', 'on_the_way') then
      raise exception using errcode = '42501', message = 'Only the seller can mark this item as picked up.';
    end if;
    update public.bargain_item_reservations set status = 'picked_up' where id = v_reservation.id returning * into v_reservation;
    update public.bargain_listing_items set status = 'sold' where id = v_item.id;
    return v_reservation;
  end if;

  if p_action = 'no_show' then
    if v_reservation.seller_id <> v_actor_id or v_reservation.status not in ('confirmed', 'on_the_way') or v_reservation.pickup_end_at > now() then
      raise exception using errcode = '42501', message = 'A no-show can only be recorded by the seller after the pickup window ends.';
    end if;
    update public.bargain_item_reservations set status = 'no_show' where id = v_reservation.id returning * into v_reservation;
    update public.bargain_listing_items set status = 'available' where id = v_item.id and status = 'reserved';
    return v_reservation;
  end if;

  raise exception using errcode = '22023', message = 'Unsupported pickup action.';
end;
$$;

revoke all on function public.manage_bargain_pickup_reservation(text, uuid, uuid, uuid, timestamptz, timestamptz) from public;
grant execute on function public.manage_bargain_pickup_reservation(text, uuid, uuid, uuid, timestamptz, timestamptz) to authenticated;
