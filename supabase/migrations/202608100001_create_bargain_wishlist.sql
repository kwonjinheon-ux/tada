-- Keep saved Bargain listings fully independent from Market saves while
-- allowing the dashboard to present both services in one wishlist.
create table if not exists public.bargain_wishlist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.bargain_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists bargain_wishlist_user_created_idx
  on public.bargain_wishlist (user_id, created_at desc);

alter table public.bargain_wishlist enable row level security;

revoke all on table public.bargain_wishlist from anon, authenticated;
grant select, insert, delete on table public.bargain_wishlist to authenticated;

create policy "Members manage their own bargain wishlist" on public.bargain_wishlist
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
