alter table public.market_listings
  add column if not exists view_count bigint not null default 0;

create or replace function public.record_market_listing_view(p_listing_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_view_count bigint;
begin
  update public.market_listings
  set view_count = view_count + 1
  where id = p_listing_id
    and status = 'published'
  returning view_count into next_view_count;

  if next_view_count is null then
    return null;
  end if;

  if auth.uid() is not null then
    insert into public.market_listing_views (user_id, listing_id, last_viewed_at)
    values (auth.uid(), p_listing_id, now())
    on conflict (user_id, listing_id) do update
      set last_viewed_at = excluded.last_viewed_at;
  end if;

  return next_view_count;
end;
$$;

revoke all on function public.record_market_listing_view(uuid) from public;
grant execute on function public.record_market_listing_view(uuid) to anon, authenticated;
