create table public.market_wishlist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.market_listing_views (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  last_viewed_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index market_wishlist_user_created_idx on public.market_wishlist (user_id, created_at desc);
create index market_listing_views_user_recent_idx on public.market_listing_views (user_id, last_viewed_at desc);

alter table public.market_wishlist enable row level security;
alter table public.market_listing_views enable row level security;

revoke all on table public.market_wishlist from anon, authenticated;
revoke all on table public.market_listing_views from anon, authenticated;
grant select, insert, delete on table public.market_wishlist to authenticated;
grant select, insert, update on table public.market_listing_views to authenticated;

create policy "Users manage their own market wishlist" on public.market_wishlist
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users read their own market listing views" on public.market_listing_views
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users add their own market listing views" on public.market_listing_views
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their own market listing views" on public.market_listing_views
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Wishlisted market listings are readable" on public.market_listings
for select to authenticated
using (
  exists (
    select 1
    from public.market_wishlist
    where market_wishlist.listing_id = market_listings.id
      and market_wishlist.user_id = (select auth.uid())
  )
);

create policy "Wishlisted market listing photos are readable" on public.market_listing_photos
for select to authenticated
using (
  exists (
    select 1
    from public.market_wishlist
    where market_wishlist.listing_id = market_listing_photos.listing_id
      and market_wishlist.user_id = (select auth.uid())
  )
);
