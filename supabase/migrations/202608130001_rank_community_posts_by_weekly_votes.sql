alter table public.community_post_shares
  drop constraint if exists community_post_shares_pkey;

alter table public.community_post_shares
  add column if not exists id bigint generated always as identity;

alter table public.community_post_shares
  add primary key (id);

create index if not exists community_post_shares_post_created_idx
  on public.community_post_shares (post_id, created_at desc);

create or replace function public.record_community_post_share(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_share_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (select 1 from public.community_posts where id = p_post_id and status = 'published') then
    raise exception 'Post not found.';
  end if;

  insert into public.community_post_shares (post_id, user_id)
  values (p_post_id, auth.uid());

  update public.community_posts
  set share_count = share_count + 1
  where id = p_post_id
  returning share_count into next_share_count;

  return next_share_count;
end;
$$;

create or replace function public.get_ranked_community_post_ids(
  p_category_slug text default null,
  p_region_city text default null,
  p_region_suburb text default null,
  p_limit integer default 40
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
    select
      id,
      row_number() over (
        partition by category_slug
        order by score desc, created_at desc
      ) as category_rank
    from filtered_posts
    where created_at >= now() - interval '7 days'
      and score > 0
  )
  select filtered_posts.id
  from filtered_posts
  left join weekly_popular_posts using (id)
  order by
    case when weekly_popular_posts.category_rank <= 3 then 0 else 1 end,
    case when weekly_popular_posts.category_rank <= 3 then filtered_posts.score end desc nulls last,
    filtered_posts.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.cast_community_post_vote(uuid, smallint) from public, anon;
revoke all on function public.record_community_post_share(uuid) from public, anon;
revoke all on function public.get_ranked_community_post_ids(text, text, text, integer) from public;
grant execute on function public.cast_community_post_vote(uuid, smallint) to authenticated;
grant execute on function public.record_community_post_share(uuid) to authenticated;
grant execute on function public.get_ranked_community_post_ids(text, text, text, integer) to anon, authenticated;
