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

  if not found or listing_status <> 'published' then
    raise exception 'This listing is not available for conversations.';
  end if;

  if new.seller_id <> listing_owner_id or new.seller_id = current_user_id then
    raise exception 'The conversation seller must own the listing.';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_market_conversation_insert() from public, anon, authenticated;

drop trigger if exists market_conversations_validate_before_insert
on public.market_conversations;

create trigger market_conversations_validate_before_insert
before insert on public.market_conversations
for each row
execute function public.validate_market_conversation_insert();

drop policy if exists "Buyers can start a listing conversation"
on public.market_conversations;

create policy "Buyers can start a listing conversation"
on public.market_conversations
for insert
to authenticated
with check (
  buyer_id = (select auth.uid())
  and seller_id <> (select auth.uid())
);
