insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'advertising-assets',
  'advertising-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Moderators manage advertising assets" on storage.objects;

create policy "Moderators manage advertising assets"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'advertising-assets'
  and (select public.market_is_moderator())
)
with check (
  bucket_id = 'advertising-assets'
  and (select public.market_is_moderator())
);
