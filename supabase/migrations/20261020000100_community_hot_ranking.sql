-- The default community feed is ordered the way Reddit orders a front page.
--
-- Until now the list promoted the three highest-scoring posts of the week in
-- each category and then fell back to pure recency. That gave a fixed shelf at
-- the top and a wall of "just posted" underneath it, so a post either sat in
-- the shelf or was carried away by the next hour of posting.
--
-- Reddit weighs a post as the log of its votes plus a constant per second of
-- its age, and that is what this is:
--
--   sign(score) * log10(max(|score|, 1)) + epoch_seconds / 45000
--
-- The logarithm means the first handful of votes count for far more than the
-- next hundred, so a post does not need a crowd to surface. 45000 seconds —
-- half a day — is worth one order of magnitude of votes, so ten points buys
-- about twelve hours of freshness and a hundred buys a day. Downvotes push a
-- post the same distance the other way.
--
-- One deviation from Reddit's published formula, and it matters at this size:
-- Reddit multiplies the time term by sign(score), so a post with no votes
-- scores exactly zero no matter when it was written, and a single upvote beats
-- every unvoted post forever. On a board where most posts sit at zero or one
-- that freezes the top of the list. Here the age always counts and the votes
-- move a post around it, which is the behaviour the formula is reached for.
--
-- The epoch offset Reddit uses is left out on purpose: it shifts every row by
-- the same constant and cannot change their order.
--
-- The explicit Recent and Trending chips do not come through here; they are
-- read straight from the table, so this only sets what a reader sees by
-- default, in All and in a single category alike.
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
  select
    post.id,
    post.author_id,
    post.is_anonymous,
    post.post_type,
    post.title,
    post.body,
    post.region_city,
    post.region_suburb,
    post.event_start_at,
    post.event_end_at,
    post.created_at,
    post.view_count,
    post.score,
    post.share_count
  from public.community_posts as post
  where post.status = 'published'
    and (p_category_slug is null or post.category_slug = p_category_slug)
    and (p_region_city is null or post.region_city = p_region_city)
    and (p_region_suburb is null or post.region_suburb = p_region_suburb)
  order by
    sign(coalesce(post.score, 0))::numeric * log(greatest(abs(coalesce(post.score, 0)), 1)::numeric)
      + extract(epoch from post.created_at)::numeric / 45000 desc,
    post.created_at desc,
    post.id desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
$$;

revoke all on function public.get_ranked_community_posts(text, text, text, integer, integer) from public;
grant execute on function public.get_ranked_community_posts(text, text, text, integer, integer) to anon, authenticated;

-- The id-only function is the fallback for a deployment that is running ahead
-- of this migration. It orders the same way, so the two cannot disagree.
create or replace function public.get_paged_ranked_community_post_ids(
  p_category_slug text default null,
  p_region_city text default null,
  p_region_suburb text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select post.id
  from public.community_posts as post
  where post.status = 'published'
    and (p_category_slug is null or post.category_slug = p_category_slug)
    and (p_region_city is null or post.region_city = p_region_city)
    and (p_region_suburb is null or post.region_suburb = p_region_suburb)
  order by
    sign(coalesce(post.score, 0))::numeric * log(greatest(abs(coalesce(post.score, 0)), 1)::numeric)
      + extract(epoch from post.created_at)::numeric / 45000 desc,
    post.created_at desc,
    post.id desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
$$;

revoke all on function public.get_paged_ranked_community_post_ids(text, text, text, integer, integer) from public;
grant execute on function public.get_paged_ranked_community_post_ids(text, text, text, integer, integer) to anon, authenticated;
