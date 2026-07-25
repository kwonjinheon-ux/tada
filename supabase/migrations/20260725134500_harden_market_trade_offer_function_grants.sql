revoke execute on function public.respond_market_trade_offer(uuid, text) from public, anon;
revoke execute on function public.cancel_market_trade_offer(uuid) from public, anon;
revoke execute on function public.complete_market_trade_offer(uuid) from public, anon;

grant execute on function public.respond_market_trade_offer(uuid, text) to authenticated;
grant execute on function public.cancel_market_trade_offer(uuid) to authenticated;
grant execute on function public.complete_market_trade_offer(uuid) to authenticated;

revoke execute on function public.refresh_market_trade_point_summary() from public, anon, authenticated;
