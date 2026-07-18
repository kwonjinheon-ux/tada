revoke all on table public.market_conversations from anon;
revoke all on table public.market_conversations from authenticated;
grant select, insert on table public.market_conversations to authenticated;

revoke all on table public.market_messages from anon;
revoke all on table public.market_messages from authenticated;
grant select, insert, update (read_at) on table public.market_messages to authenticated;
