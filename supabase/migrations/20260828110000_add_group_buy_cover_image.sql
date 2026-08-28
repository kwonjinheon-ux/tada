alter table public.group_buys
  add column cover_image_path text,
  add column cover_image_alt text;

alter table public.group_buys
  add constraint group_buys_cover_image_path_check
  check (cover_image_path is null or cover_image_path ~ '^[0-9a-f-]{36}/group-buy/[0-9a-f-]{36}\.(jpg|png|webp)$');

create policy "Owners delete group buy images" on storage.objects
for delete to authenticated
using (bucket_id = 'group-buy-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
