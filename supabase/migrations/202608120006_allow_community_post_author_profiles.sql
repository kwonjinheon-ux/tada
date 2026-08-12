-- Post authors are also community participants, even if they have not written a comment yet.
drop policy if exists "Community commenter profiles are readable" on public.community_comment_profiles;

create policy "Community participant profiles are readable"
on public.community_comment_profiles
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.community_post_comments
    where community_post_comments.author_id = community_comment_profiles.id
  )
  or exists (
    select 1
    from public.community_posts
    where community_posts.author_id = community_comment_profiles.id
      and community_posts.status = 'published'
  )
);

create policy "Community post author avatars are readable"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'profile-avatars'
  and exists (
    select 1
    from public.community_comment_profiles
    join public.community_posts on community_posts.author_id = community_comment_profiles.id
    where community_comment_profiles.avatar_path = storage.objects.name
      and community_posts.status = 'published'
  )
);
