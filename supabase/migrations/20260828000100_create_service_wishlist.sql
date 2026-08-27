create table public.service_wishlist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid not null references public.service_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, service_id)
);

create index service_wishlist_service_idx on public.service_wishlist (service_id, created_at desc);
alter table public.service_wishlist enable row level security;
grant select, insert, delete on public.service_wishlist to authenticated;

create policy "Users read own saved services" on public.service_wishlist
for select to authenticated using (user_id = (select auth.uid()));

create policy "Users save published services" on public.service_wishlist
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.service_listings
    where service_listings.id = service_wishlist.service_id
      and service_listings.status = 'published'
      and service_listings.owner_id <> (select auth.uid())
  )
);

create policy "Users remove own saved services" on public.service_wishlist
for delete to authenticated using (user_id = (select auth.uid()));
