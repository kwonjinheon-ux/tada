-- Restore the browser upload flow used by the current listing form. The
-- optimised-image experiment was reverted in application code, so its stricter
-- server-only policies must not prevent users from attaching photos.
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'market-listing-images';

drop policy if exists "Users manage own AI draft images" on storage.objects;

create policy "Users upload own market listing images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'market-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users update own market listing images" on storage.objects
for update to authenticated
using (
  bucket_id = 'market-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'market-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users delete own market listing images" on storage.objects
for delete to authenticated
using (
  bucket_id = 'market-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users read own market listing images" on storage.objects
for select to authenticated
using (
  bucket_id = 'market-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users create own market listing photos" on public.market_listing_photos
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.market_listings
    where market_listings.id = market_listing_photos.listing_id
      and market_listings.owner_id = (select auth.uid())
  )
);

create policy "Users update own market listing photos" on public.market_listing_photos
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Users delete own market listing photos" on public.market_listing_photos
for delete to authenticated
using (owner_id = (select auth.uid()));
