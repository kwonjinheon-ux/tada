create table public.community_wishlist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index community_wishlist_user_created_idx
  on public.community_wishlist (user_id, created_at desc);

alter table public.community_wishlist enable row level security;

revoke all on table public.community_wishlist from anon, authenticated;
grant select, insert, delete on table public.community_wishlist to authenticated;

create policy "Users manage their own community wishlist" on public.community_wishlist
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
