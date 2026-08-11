create table public.community_post_images (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade, storage_path text not null unique,
  display_order integer not null default 0, created_at timestamptz not null default now()
);
create index community_post_images_post_idx on public.community_post_images (post_id, display_order);
alter table public.community_post_images enable row level security;
create policy "Published community images are readable" on public.community_post_images for select to anon, authenticated using (exists (select 1 from public.community_posts where id = post_id and (status = 'published' or author_id = (select auth.uid()))));
create policy "Users attach own community images" on public.community_post_images for insert to authenticated with check (owner_id = (select auth.uid()) and (storage.foldername(storage_path))[1] = (select auth.uid()::text) and exists (select 1 from public.community_posts where id = post_id and author_id = (select auth.uid())));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('community-post-images', 'community-post-images', false, 5242880, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "Users upload own community images" on storage.objects for insert to authenticated with check (bucket_id = 'community-post-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users delete own community images" on storage.objects for delete to authenticated using (bucket_id = 'community-post-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Published community storage images are readable" on storage.objects for select to anon, authenticated using (bucket_id = 'community-post-images' and exists (select 1 from public.community_post_images join public.community_posts on community_posts.id = community_post_images.post_id where community_post_images.storage_path = storage.objects.name and (community_posts.status = 'published' or community_posts.author_id = (select auth.uid()))));
