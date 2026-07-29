-- RLS evaluates referenced functions with the caller's privileges. These
-- functions expose only boolean policy decisions and must be executable by
-- authenticated clients for the policies that reference them to work.
grant execute on function public.market_is_moderator() to authenticated;
grant execute on function public.market_user_is_active() to authenticated;
grant execute on function public.market_users_are_blocked(uuid, uuid) to authenticated;
