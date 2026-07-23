create table public.market_keyword_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  keyword text not null check (char_length(btrim(keyword)) between 2 and 80),
  normalized_keyword text generated always as (lower(btrim(keyword))) stored,
  category_slug text references public.market_categories(slug) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, normalized_keyword)
);

create index market_keyword_alerts_user_created_idx on public.market_keyword_alerts (user_id, created_at desc);

alter table public.market_keyword_alerts enable row level security;
revoke all on table public.market_keyword_alerts from anon, authenticated;
grant select, insert, delete on table public.market_keyword_alerts to authenticated;

create policy "Users manage their own market keyword alerts" on public.market_keyword_alerts
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.enforce_market_keyword_alert_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*)
    from public.market_keyword_alerts
    where user_id = new.user_id
  ) >= 20 then
    raise exception 'A maximum of 20 keyword alerts is allowed.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_market_keyword_alert_limit() from public;

create trigger market_keyword_alerts_limit_before_insert
before insert on public.market_keyword_alerts
for each row execute function public.enforce_market_keyword_alert_limit();
