create policy "Community commenter avatars are readable" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'profile-avatars'
  and exists (
    select 1
    from public.community_comment_profiles
    join public.community_post_comments on community_post_comments.author_id = community_comment_profiles.id
    where community_comment_profiles.avatar_path = storage.objects.name
  )
);
