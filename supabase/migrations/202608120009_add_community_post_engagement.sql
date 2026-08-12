alter table public.community_posts
  add column if not exists score integer not null default 0,
  add column if not exists share_count integer not null default 0;

create table public.community_post_votes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.community_post_shares (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index community_post_votes_post_idx on public.community_post_votes (post_id);
create index community_post_shares_post_idx on public.community_post_shares (post_id);

alter table public.community_post_votes enable row level security;
alter table public.community_post_shares enable row level security;
revoke all on table public.community_post_votes from anon, authenticated;
revoke all on table public.community_post_shares from anon, authenticated;

create or replace function public.cast_community_post_vote(p_post_id uuid, p_value smallint)
returns table (score integer, my_vote smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_score integer;
begin
  if auth.uid() is null or p_value not in (-1, 0, 1) then
    raise exception 'Invalid vote.';
  end if;

  if not exists (select 1 from public.community_posts where id = p_post_id and status = 'published') then
    raise exception 'Post not found.';
  end if;

  if p_value = 0 then
    delete from public.community_post_votes where post_id = p_post_id and user_id = auth.uid();
  else
    insert into public.community_post_votes (post_id, user_id, value, updated_at)
    values (p_post_id, auth.uid(), p_value, now())
    on conflict (post_id, user_id) do update set value = excluded.value, updated_at = excluded.updated_at;
  end if;

  update public.community_posts
  set score = coalesce((select sum(value)::integer from public.community_post_votes where post_id = p_post_id), 0)
  where id = p_post_id
  returning community_posts.score into next_score;

  return query select next_score, p_value;
end;
$$;

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
  values (p_post_id, auth.uid())
  on conflict (post_id, user_id) do nothing;

  if found then
    update public.community_posts set share_count = share_count + 1 where id = p_post_id returning community_posts.share_count into next_share_count;
  else
    select share_count into next_share_count from public.community_posts where id = p_post_id;
  end if;

  return next_share_count;
end;
$$;

revoke all on function public.cast_community_post_vote(uuid, smallint) from public;
revoke all on function public.record_community_post_share(uuid) from public;
grant execute on function public.cast_community_post_vote(uuid, smallint) to authenticated;
grant execute on function public.record_community_post_share(uuid) to authenticated;

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
    where existing.last_viewed_at <= now() - interval '3 hours';

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
