create table public.market_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('message', 'offer', 'trade', 'keyword', 'wishlist')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 300),
  href text not null check (href like '/market%'),
  listing_id uuid references public.market_listings(id) on delete cascade,
  conversation_id uuid references public.market_conversations(id) on delete cascade,
  offer_id uuid references public.market_trade_offers(id) on delete cascade,
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index market_notifications_user_created_idx
  on public.market_notifications (user_id, created_at desc);
create index market_notifications_user_unread_idx
  on public.market_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.market_notifications enable row level security;
revoke all on table public.market_notifications from anon, authenticated;
grant select, delete, update (read_at) on table public.market_notifications to authenticated;

create policy "Users read own market notifications"
on public.market_notifications for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users mark own market notifications read"
on public.market_notifications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete own market notifications"
on public.market_notifications for delete to authenticated
using ((select auth.uid()) = user_id);

alter table public.market_notifications replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'market_notifications'
  ) then
    alter publication supabase_realtime add table public.market_notifications;
  end if;
end;
$$;

create or replace function public.notify_market_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.body like 'New offer:%'
    or new.body like 'Offer accepted.%'
    or new.body = 'Offer declined.'
    or new.body = 'Offer cancelled.'
    or new.body like 'Trade completed.%' then
    return new;
  end if;

  insert into public.market_notifications (
    user_id, actor_id, type, title, body, href, conversation_id, dedupe_key
  )
  values (
    new.recipient_id,
    new.sender_id,
    'message',
    'New message',
    left(new.body, 180),
    '/market/dashboard/messages?conversation=' || new.conversation_id,
    new.conversation_id,
    'message:' || new.id
  )
  on conflict (user_id, dedupe_key) do nothing;

  return new;
end;
$$;

revoke execute on function public.notify_market_message() from public, anon, authenticated;

create trigger market_messages_notify_after_insert
after insert on public.market_messages
for each row execute function public.notify_market_message();

create or replace function public.notify_market_trade_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_title text;
begin
  select title into listing_title
  from public.market_listings
  where id = new.listing_id;

  if tg_op = 'INSERT' then
    insert into public.market_notifications (
      user_id, actor_id, type, title, body, href, listing_id, conversation_id, offer_id, dedupe_key,
      metadata
    )
    values (
      new.seller_id,
      new.buyer_id,
      'offer',
      'New offer received',
      to_char(new.amount_cents / 100.0, 'FM$999,999,990.00') || ' for ' || coalesce(listing_title, 'your listing'),
      '/market/dashboard/messages?conversation=' || new.conversation_id,
      new.listing_id,
      new.conversation_id,
      new.id,
      'offer:' || new.id,
      jsonb_build_object('status', new.status, 'amountCents', new.amount_cents)
    )
    on conflict (user_id, dedupe_key) do nothing;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'accepted' then
    insert into public.market_notifications (
      user_id, actor_id, type, title, body, href, listing_id, conversation_id, offer_id, dedupe_key,
      metadata
    ) values (
      new.buyer_id, new.seller_id, 'trade', 'Offer accepted',
      'The seller accepted your offer for ' || coalesce(listing_title, 'this listing') || '.',
      '/market/dashboard/messages?conversation=' || new.conversation_id,
      new.listing_id, new.conversation_id, new.id,
      'offer-status:' || new.id || ':accepted', jsonb_build_object('status', new.status)
    ) on conflict (user_id, dedupe_key) do nothing;
  elsif new.status = 'declined' then
    insert into public.market_notifications (
      user_id, actor_id, type, title, body, href, listing_id, conversation_id, offer_id, dedupe_key,
      metadata
    ) values (
      new.buyer_id, new.seller_id, 'trade', 'Offer declined',
      'The seller declined your offer for ' || coalesce(listing_title, 'this listing') || '.',
      '/market/dashboard/messages?conversation=' || new.conversation_id,
      new.listing_id, new.conversation_id, new.id,
      'offer-status:' || new.id || ':declined', jsonb_build_object('status', new.status)
    ) on conflict (user_id, dedupe_key) do nothing;
  elsif new.status = 'cancelled' then
    insert into public.market_notifications (
      user_id, actor_id, type, title, body, href, listing_id, conversation_id, offer_id, dedupe_key,
      metadata
    ) values (
      new.seller_id, new.buyer_id, 'trade', 'Offer cancelled',
      'The buyer cancelled their offer for ' || coalesce(listing_title, 'this listing') || '.',
      '/market/dashboard/messages?conversation=' || new.conversation_id,
      new.listing_id, new.conversation_id, new.id,
      'offer-status:' || new.id || ':cancelled', jsonb_build_object('status', new.status)
    ) on conflict (user_id, dedupe_key) do nothing;
  elsif new.status = 'completed' then
    insert into public.market_notifications (
      user_id, actor_id, type, title, body, href, listing_id, conversation_id, offer_id, dedupe_key,
      metadata
    )
    values
      (
        new.buyer_id, new.seller_id, 'trade', 'Trade complete',
        'Purchase confirmed. You both received 10 trust points.',
        '/market/dashboard/messages?conversation=' || new.conversation_id,
        new.listing_id, new.conversation_id, new.id,
        'offer-status:' || new.id || ':completed:' || new.buyer_id,
        jsonb_build_object('status', new.status)
      ),
      (
        new.seller_id, new.buyer_id, 'trade', 'Trade complete',
        'The buyer confirmed the purchase. You both received 10 trust points.',
        '/market/dashboard/messages?conversation=' || new.conversation_id,
        new.listing_id, new.conversation_id, new.id,
        'offer-status:' || new.id || ':completed:' || new.seller_id,
        jsonb_build_object('status', new.status)
      )
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.notify_market_trade_offer() from public, anon, authenticated;

create trigger market_trade_offers_notify_after_change
after insert or update of status on public.market_trade_offers
for each row execute function public.notify_market_trade_offer();

create or replace function public.notify_market_listing_watchers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  searchable_text text;
begin
  searchable_text := lower(new.title || ' ' || coalesce(new.description, ''));

  if (
    (tg_op = 'INSERT' and new.status = 'published')
    or (
      tg_op = 'UPDATE'
      and new.status = 'published'
      and old.status is distinct from new.status
    )
  ) then
    insert into public.market_notifications (
      user_id, actor_id, type, title, body, href, listing_id, dedupe_key, metadata
    )
    select
      alert.user_id,
      new.owner_id,
      'keyword',
      'New match for "' || alert.keyword || '"',
      left(new.title, 180),
      '/market/' || new.id,
      new.id,
      'keyword:' || alert.id || ':listing:' || new.id,
      jsonb_build_object('keyword', alert.keyword, 'categorySlug', new.category_slug)
    from public.market_keyword_alerts alert
    where alert.user_id <> new.owner_id
      and (alert.category_slug is null or alert.category_slug = new.category_slug)
      and searchable_text like '%' || alert.normalized_keyword || '%'
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  if tg_op = 'UPDATE' and (
    old.price_cents is distinct from new.price_cents
    or old.status is distinct from new.status
  ) then
    insert into public.market_notifications (
      user_id, actor_id, type, title, body, href, listing_id, dedupe_key, metadata
    )
    select
      saved.user_id,
      new.owner_id,
      'wishlist',
      case
        when old.price_cents is distinct from new.price_cents then 'Saved item price updated'
        else 'Saved item status updated'
      end,
      case
        when old.price_cents is distinct from new.price_cents
          then new.title || ' is now ' || to_char(new.price_cents / 100.0, 'FM$999,999,990.00') || '.'
        else new.title || ' is now ' || initcap(new.status::text) || '.'
      end,
      '/market/' || new.id,
      new.id,
      'wishlist:' || saved.user_id || ':listing:' || new.id || ':' ||
        case
          when old.price_cents is distinct from new.price_cents then 'price:' || new.price_cents
          else 'status:' || new.status::text
        end,
      jsonb_build_object('status', new.status, 'priceCents', new.price_cents)
    from public.market_wishlist saved
    where saved.listing_id = new.id
      and saved.user_id <> new.owner_id
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.notify_market_listing_watchers() from public, anon, authenticated;

create trigger market_listings_notify_watchers_after_change
after insert or update of status, price_cents on public.market_listings
for each row execute function public.notify_market_listing_watchers();

insert into public.market_notifications (
  user_id, actor_id, type, title, body, href, conversation_id, dedupe_key, read_at, created_at
)
select
  message.recipient_id,
  message.sender_id,
  'message',
  'New message',
  left(message.body, 180),
  '/market/dashboard/messages?conversation=' || message.conversation_id,
  message.conversation_id,
  'message:' || message.id,
  message.read_at,
  message.created_at
from public.market_messages message
where message.body not like 'New offer:%'
  and message.body not like 'Offer accepted.%'
  and message.body <> 'Offer declined.'
  and message.body <> 'Offer cancelled.'
  and message.body not like 'Trade completed.%'
on conflict (user_id, dedupe_key) do nothing;

insert into public.market_notifications (
  user_id, actor_id, type, title, body, href, listing_id, conversation_id, offer_id, dedupe_key,
  metadata, read_at, created_at
)
select
  offer.seller_id,
  offer.buyer_id,
  'offer',
  'New offer received',
  to_char(offer.amount_cents / 100.0, 'FM$999,999,990.00') || ' for ' || listing.title,
  '/market/dashboard/messages?conversation=' || offer.conversation_id,
  offer.listing_id,
  offer.conversation_id,
  offer.id,
  'offer:' || offer.id,
  jsonb_build_object('status', offer.status, 'amountCents', offer.amount_cents),
  case when offer.status = 'pending' then null else offer.responded_at end,
  offer.created_at
from public.market_trade_offers offer
join public.market_listings listing on listing.id = offer.listing_id
on conflict (user_id, dedupe_key) do nothing;
