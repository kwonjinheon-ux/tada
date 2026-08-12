create table public.community_post_views (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  last_viewed_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index community_post_views_user_recent_idx on public.community_post_views (user_id, last_viewed_at desc);

alter table public.community_post_views enable row level security;
revoke all on table public.community_post_views from anon, authenticated;

create or replace function public.record_community_post_view(p_post_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_view_count bigint;
begin
  if auth.uid() is null then
    return null;
  end if;

  insert into public.community_post_views as existing (user_id, post_id, last_viewed_at)
  values (auth.uid(), p_post_id, now())
  on conflict (user_id, post_id) do update
    set last_viewed_at = excluded.last_viewed_at
    where existing.last_viewed_at <= now() - interval '1 hour';

  if not found then
    select view_count into next_view_count from public.community_posts where id = p_post_id and status = 'published';
    return next_view_count;
  end if;

  update public.community_posts
  set view_count = view_count + 1
  where id = p_post_id and status = 'published'
  returning view_count into next_view_count;

  return next_view_count;
end;
$$;

revoke all on function public.record_community_post_view(uuid) from public;
grant execute on function public.record_community_post_view(uuid) to authenticated;
