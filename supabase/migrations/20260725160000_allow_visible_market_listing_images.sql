drop policy if exists "Published market listing images are readable" on storage.objects;
drop policy if exists "Published market listing image variants are readable" on storage.objects;

create policy "Visible market listing images are readable"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'market-listing-images'
  and exists (
    select 1
    from public.market_listing_photos
    join public.market_listings on market_listings.id = market_listing_photos.listing_id
    where (
      market_listing_photos.storage_path = storage.objects.name
      or market_listing_photos.thumbnail_path = storage.objects.name
      or market_listing_photos.listing_path = storage.objects.name
      or market_listing_photos.detail_path = storage.objects.name
    )
      and (
        market_listings.status in ('published', 'pending', 'sold')
        or market_listings.owner_id = (select auth.uid())
      )
  )
);
