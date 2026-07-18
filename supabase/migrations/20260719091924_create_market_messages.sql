create table public.market_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  last_message_preview text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id),
  unique (listing_id, buyer_id)
);

create table public.market_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.market_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index market_conversations_participant_idx
  on public.market_conversations (buyer_id, last_message_at desc nulls last);
create index market_conversations_seller_idx
  on public.market_conversations (seller_id, last_message_at desc nulls last);
create index market_messages_conversation_idx
  on public.market_messages (conversation_id, created_at asc);
create index market_messages_unread_idx
  on public.market_messages (recipient_id, conversation_id, created_at desc)
  where read_at is null;

alter table public.market_conversations enable row level security;
alter table public.market_messages enable row level security;

grant select, insert on public.market_conversations to authenticated;
grant select, insert, update (read_at) on public.market_messages to authenticated;

create policy "Conversation participants can read conversations"
on public.market_conversations for select to authenticated
using ((select auth.uid()) in (buyer_id, seller_id));

create policy "Buyers can start a listing conversation"
on public.market_conversations for insert to authenticated
with check (
  buyer_id = (select auth.uid())
  and seller_id <> (select auth.uid())
  and exists (
    select 1 from public.market_listings
    where market_listings.id = market_conversations.listing_id
      and market_listings.owner_id = market_conversations.seller_id
      and market_listings.status = 'published'
  )
);

create policy "Conversation participants can read messages"
on public.market_messages for select to authenticated
using (
  exists (
    select 1 from public.market_conversations
    where market_conversations.id = market_messages.conversation_id
      and (select auth.uid()) in (market_conversations.buyer_id, market_conversations.seller_id)
  )
);

create policy "Conversation participants can send messages"
on public.market_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.market_conversations
    where market_conversations.id = market_messages.conversation_id
      and (select auth.uid()) in (market_conversations.buyer_id, market_conversations.seller_id)
  )
);

create policy "Recipients can mark messages read"
on public.market_messages for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create or replace function public.prepare_market_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation public.market_conversations;
begin
  if new.sender_id <> auth.uid() then
    raise exception 'Messages must be sent by the signed-in user.';
  end if;

  select * into conversation
  from public.market_conversations
  where id = new.conversation_id;

  if not found or new.sender_id not in (conversation.buyer_id, conversation.seller_id) then
    raise exception 'You are not a participant in this conversation.';
  end if;

  new.recipient_id := case
    when new.sender_id = conversation.buyer_id then conversation.seller_id
    else conversation.buyer_id
  end;
  new.body := trim(new.body);
  return new;
end;
$$;

revoke all on function public.prepare_market_message() from public;

create trigger market_messages_prepare_before_insert
before insert on public.market_messages
for each row execute function public.prepare_market_message();

create or replace function public.refresh_market_conversation_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.market_conversations
  set last_message_preview = left(new.body, 160),
      last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

revoke all on function public.refresh_market_conversation_activity() from public;

create trigger market_messages_refresh_conversation_activity
after insert on public.market_messages
for each row execute function public.refresh_market_conversation_activity();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'market_messages'
  ) then
    alter publication supabase_realtime add table public.market_messages;
  end if;
end;
$$;
