-- A post can carry two links under its body: where its story came from, and a
-- video that belongs with it.
--
-- Both are optional and both are plain URLs rather than an extracted id. The
-- id YouTube uses is derived where the player is built, so a link pasted from
-- the Share button keeps its timestamp and the row still says exactly what the
-- writer gave us.
--
-- The checks are deliberately loose — a scheme, a host and a length. Which
-- hosts count as a video is a product decision that changes more often than a
-- table does, and it is already made in the form, the API contract and the
-- renderer, which all read it from one module.
alter table public.community_posts
  add column source_url text,
  add column video_url text;

alter table public.community_posts
  add constraint community_posts_source_url_valid
  check (source_url is null or source_url ~ '^https?://[^[:space:]]{3,500}$');

alter table public.community_posts
  add constraint community_posts_video_url_valid
  check (video_url is null or video_url ~ '^https?://[^[:space:]]{3,500}$');

comment on column public.community_posts.source_url is 'Optional link to the article or page a post is based on.';
comment on column public.community_posts.video_url is 'Optional YouTube link; the player is embedded under the post body.';
