drop policy "Group buy images are readable" on storage.objects;

create policy "Owners and published group buy readers access images" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'group-buy-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.group_buy_items
      join public.group_buys on group_buys.id = group_buy_items.group_buy_id
      where group_buy_items.photo_path = storage.objects.name
        and group_buys.status = 'open'
    )
  )
);
