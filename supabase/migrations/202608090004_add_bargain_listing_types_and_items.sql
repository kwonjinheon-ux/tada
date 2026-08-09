-- Keep Bargain data independent from Market while allowing a Moving/Garage
-- listing to contain up to ten separately priced photographed items.
alter table public.bargain_listings
  add column if not exists bargain_type text;

update public.bargain_listings
set bargain_type = case
  when price_cents <= 200 then '2-dollar-deals'
  when price_cents <= 500 then '5-dollar-deals'
  when price_cents <= 1000 then '10-dollar-deals'
  else 'moving-sale'
end
where bargain_type is null;

alter table public.bargain_listings
  alter column bargain_type set default '2-dollar-deals',
  alter column bargain_type set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bargain_listings_bargain_type_check') then
    alter table public.bargain_listings add constraint bargain_listings_bargain_type_check
      check (bargain_type in ('2-dollar-deals', '5-dollar-deals', '10-dollar-deals', 'moving-sale', 'garage-sale'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bargain_listings_price_tier_check') then
    alter table public.bargain_listings add constraint bargain_listings_price_tier_check check (
      (bargain_type = '2-dollar-deals' and price_cents between 0 and 200)
      or (bargain_type = '5-dollar-deals' and price_cents between 0 and 500)
      or (bargain_type = '10-dollar-deals' and price_cents between 0 and 1000)
      or bargain_type in ('moving-sale', 'garage-sale')
    );
  end if;
end $$;

create table if not exists public.bargain_listing_items (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.bargain_listings(id) on delete cascade,
  photo_id uuid not null references public.bargain_listing_photos(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  price_cents integer not null check (price_cents >= 0),
  description text not null check (char_length(trim(description)) between 1 and 1000),
  display_order integer not null default 0 check (display_order between 0 and 9),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, photo_id),
  unique (listing_id, display_order)
);

create index if not exists bargain_listing_items_listing_idx on public.bargain_listing_items (listing_id, display_order);
grant select on public.bargain_listing_items to anon;
grant select, insert, update, delete on public.bargain_listing_items to authenticated;
alter table public.bargain_listing_items enable row level security;

create policy "Visible bargain listing items are publicly readable" on public.bargain_listing_items
for select to anon, authenticated using (
  exists (select 1 from public.bargain_listings where bargain_listings.id = bargain_listing_items.listing_id and (bargain_listings.status in ('published', 'pending', 'sold') or bargain_listings.owner_id = (select auth.uid())))
);
create policy "Members create items for their own bargain listings" on public.bargain_listing_items
for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (select 1 from public.bargain_listings where bargain_listings.id = bargain_listing_items.listing_id and bargain_listings.owner_id = (select auth.uid())) and exists (select 1 from public.bargain_listing_photos where bargain_listing_photos.id = bargain_listing_items.photo_id and bargain_listing_photos.listing_id = bargain_listing_items.listing_id and bargain_listing_photos.owner_id = (select auth.uid()))
);
create policy "Members update their own bargain listing items" on public.bargain_listing_items
for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Members delete their own bargain listing items" on public.bargain_listing_items
for delete to authenticated using (owner_id = (select auth.uid()));

create or replace function public.touch_bargain_listing_items_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger bargain_listing_items_touch_updated_at before update on public.bargain_listing_items
for each row execute function public.touch_bargain_listing_items_updated_at();

-- Storage uploads request their metadata back. The creator therefore needs a
-- temporary read path before the public listing-photo row has been inserted.
create policy "Members read their own bargain images" on storage.objects for select to authenticated
using (bucket_id = 'bargain-listing-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
