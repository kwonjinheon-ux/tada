create policy "Published listing images are readable" on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'listing-images'
  and exists (
    select 1
    from public.content_post_photos
    join public.content_posts on content_posts.id = content_post_photos.post_id
    where content_post_photos.storage_bucket = storage.objects.bucket_id
      and content_post_photos.storage_path = storage.objects.name
      and (content_posts.status = 'published' or content_posts.author_id = (select auth.uid()))
  )
);
