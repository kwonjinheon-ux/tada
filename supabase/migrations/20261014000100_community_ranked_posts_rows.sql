-- The feed asked the ranking function for ids and then read the rows for those
-- ids, so every page cost two sequential round trips to the database — the
-- second one measured ~160ms of the feed's critical path. The ranking already
-- has the rows in hand, so it returns them.
--
-- The ordering is the one get_paged_ranked_community_post_ids established and
-- is copied unchanged: the top three weekly-popular posts in each category
-- first, then everything by recency. One function covers both callers, since
-- the unpaged feed is the same query at offset 0.
create or replace function public.get_ranked_community_posts(
  p_category_slug text default null,
  p_region_city text default null,
  p_region_suburb text default null,
  p_limit integer default 40,
  p_offset integer default 0
)
returns table (
  id uuid,
  author_id uuid,
  is_anonymous boolean,
  post_type text,
  title text,
  body text,
  region_city text,
  region_suburb text,
  event_start_at timestamptz,
  event_end_at timestamptz,
  created_at timestamptz,
  view_count bigint,
  score integer,
  share_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered_posts as (
    select post.*
    from public.community_posts as post
    where post.status = 'published'
      and (p_category_slug is null or post.category_slug = p_category_slug)
      and (p_region_city is null or post.region_city = p_region_city)
      and (p_region_suburb is null or post.region_suburb = p_region_suburb)
  ),
  weekly_popular_posts as (
    select filtered_posts.id, row_number() over (
      partition by filtered_posts.category_slug
      order by filtered_posts.score desc, filtered_posts.created_at desc, filtered_posts.id desc
    ) as category_rank
    from filtered_posts
    where filtered_posts.created_at >= now() - interval '7 days' and filtered_posts.score > 0
  )
  select
    filtered_posts.id,
    filtered_posts.author_id,
    filtered_posts.is_anonymous,
    filtered_posts.post_type,
    filtered_posts.title,
    filtered_posts.body,
    filtered_posts.region_city,
    filtered_posts.region_suburb,
    filtered_posts.event_start_at,
    filtered_posts.event_end_at,
    filtered_posts.created_at,
    filtered_posts.view_count,
    filtered_posts.score,
    filtered_posts.share_count
  from filtered_posts
  left join weekly_popular_posts using (id)
  order by
    case when weekly_popular_posts.category_rank <= 3 then 0 else 1 end,
    case when weekly_popular_posts.category_rank <= 3 then filtered_posts.score end desc nulls last,
    filtered_posts.created_at desc,
    filtered_posts.id desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
$$;

revoke all on function public.get_ranked_community_posts(text, text, text, integer, integer) from public;
grant execute on function public.get_ranked_community_posts(text, text, text, integer, integer) to anon, authenticated;
