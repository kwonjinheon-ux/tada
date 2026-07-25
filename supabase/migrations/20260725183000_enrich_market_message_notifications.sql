create or replace function public.notify_market_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  listing_id_value uuid;
  listing_title text;
begin
  if new.body like 'New offer:%'
    or new.body like 'Offer accepted.%'
    or new.body = 'Offer declined.'
    or new.body = 'Offer cancelled.'
    or new.body like 'Trade completed.%' then
    return new;
  end if;

  select
    conversation.listing_id,
    listing.title,
    profile.display_name
  into
    listing_id_value,
    listing_title,
    actor_name
  from public.market_conversations conversation
  join public.market_listings listing
    on listing.id = conversation.listing_id
  left join public.profiles profile
    on profile.id = new.sender_id
  where conversation.id = new.conversation_id;

  insert into public.market_notifications (
    user_id,
    actor_id,
    type,
    title,
    body,
    href,
    listing_id,
    conversation_id,
    dedupe_key,
    metadata
  )
  values (
    new.recipient_id,
    new.sender_id,
    'message',
    left('New message from ' || coalesce(actor_name, 'Tada member'), 120),
    left(new.body, 180),
    '/market/dashboard/messages?conversation=' || new.conversation_id,
    listing_id_value,
    new.conversation_id,
    'message:' || new.id,
    jsonb_build_object(
      'actorName', coalesce(actor_name, 'Tada member'),
      'listingTitle', coalesce(listing_title, 'Marketplace listing')
    )
  )
  on conflict (user_id, dedupe_key) do nothing;

  return new;
end;
$$;

revoke execute on function public.notify_market_message() from public, anon, authenticated;

update public.market_notifications notification
set
  actor_id = message.sender_id,
  listing_id = conversation.listing_id,
  title = left('New message from ' || coalesce(profile.display_name, 'Tada member'), 120),
  metadata = notification.metadata || jsonb_build_object(
    'actorName', coalesce(profile.display_name, 'Tada member'),
    'listingTitle', coalesce(listing.title, 'Marketplace listing')
  )
from public.market_messages message
join public.market_conversations conversation
  on conversation.id = message.conversation_id
join public.market_listings listing
  on listing.id = conversation.listing_id
left join public.profiles profile
  on profile.id = message.sender_id
where notification.type = 'message'
  and notification.dedupe_key = 'message:' || message.id;
