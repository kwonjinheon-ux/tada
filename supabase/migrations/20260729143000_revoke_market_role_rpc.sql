-- Role checks are made through the caller's RLS-protected own-role row.
-- The function remains available only to database policies, not PostgREST callers.
revoke execute on function public.market_is_moderator() from authenticated;
