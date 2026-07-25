alter table public.market_messages replica identity full;
alter table public.market_trade_offers replica identity full;
alter table public.market_listings replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'market_trade_offers'
  ) then
    alter publication supabase_realtime add table public.market_trade_offers;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'market_listings'
  ) then
    alter publication supabase_realtime add table public.market_listings;
  end if;
end;
$$;

create or replace function public.announce_market_trade_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.market_messages (conversation_id, sender_id, recipient_id, body)
  values (
    new.conversation_id,
    new.buyer_id,
    new.buyer_id,
    'New offer: ' || to_char(new.amount_cents / 100.0, 'FM$999,999,990.00')
  );

  return new;
end;
$$;

revoke execute on function public.announce_market_trade_offer() from public, anon, authenticated;

drop trigger if exists market_trade_offers_announce_after_insert on public.market_trade_offers;
create trigger market_trade_offers_announce_after_insert
after insert on public.market_trade_offers
for each row execute function public.announce_market_trade_offer();
