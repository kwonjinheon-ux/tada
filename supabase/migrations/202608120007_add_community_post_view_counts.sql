alter table public.community_posts
  add column if not exists view_count bigint not null default 0;

create or replace function public.record_community_post_view(p_post_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_view_count bigint;
begin
  update public.community_posts
  set view_count = view_count + 1
  where id = p_post_id
    and status = 'published'
  returning view_count into next_view_count;

  return next_view_count;
end;
$$;

revoke all on function public.record_community_post_view(uuid) from public;
grant execute on function public.record_community_post_view(uuid) to anon, authenticated;
