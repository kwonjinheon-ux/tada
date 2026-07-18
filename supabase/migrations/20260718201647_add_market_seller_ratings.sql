alter table public.market_seller_profiles
  add column if not exists rating_average numeric(3, 2) not null default 0
    check (rating_average >= 0 and rating_average <= 5),
  add column if not exists rating_count integer not null default 0
    check (rating_count >= 0);

create table public.market_seller_ratings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seller_id <> rater_id),
  unique (rater_id, listing_id)
);

create index market_seller_ratings_seller_idx
  on public.market_seller_ratings (seller_id, created_at desc);

alter table public.market_seller_ratings enable row level security;

-- Rating submission is deliberately not exposed yet. A later voting flow must
-- validate the buyer and listing state before adding authenticated write policies.

create or replace function public.refresh_market_seller_rating_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_seller_id uuid;
begin
  if tg_op = 'DELETE' then
    target_seller_id := old.seller_id;
  else
    target_seller_id := new.seller_id;
  end if;
  update public.market_seller_profiles
  set
    rating_count = (
      select count(*)
      from public.market_seller_ratings
      where seller_id = target_seller_id
    ),
    rating_average = coalesce((
      select round(avg(score)::numeric, 2)
      from public.market_seller_ratings
      where seller_id = target_seller_id
    ), 0),
    updated_at = now()
  where id = target_seller_id;

  return coalesce(new, old);
end;
$$;

revoke all on function public.refresh_market_seller_rating_summary() from public;

create trigger market_seller_ratings_refresh_summary
after insert or update or delete on public.market_seller_ratings
for each row execute function public.refresh_market_seller_rating_summary();
