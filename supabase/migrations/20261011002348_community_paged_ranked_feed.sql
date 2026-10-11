-- Keep the existing weekly-popular ordering while allowing every published
-- post to be reached through the numbered community index.
create function public.get_paged_ranked_community_post_ids(
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
  with filtered_posts as (
    select post.id, post.category_slug, post.score, post.created_at
    from public.community_posts as post
    where post.status = 'published'
      and (p_category_slug is null or post.category_slug = p_category_slug)
      and (p_region_city is null or post.region_city = p_region_city)
      and (p_region_suburb is null or post.region_suburb = p_region_suburb)
  ),
  weekly_popular_posts as (
    select id, row_number() over (
      partition by category_slug order by score desc, created_at desc, id desc
    ) as category_rank
    from filtered_posts
    where created_at >= now() - interval '7 days' and score > 0
  )
  select filtered_posts.id
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

revoke all on function public.get_paged_ranked_community_post_ids(text, text, text, integer, integer) from public;
grant execute on function public.get_paged_ranked_community_post_ids(text, text, text, integer, integer) to anon, authenticated;
