create table public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_post_comments_post_idx on public.community_post_comments (post_id, created_at asc);
create index community_post_comments_author_idx on public.community_post_comments (author_id, created_at desc);

alter table public.community_post_comments enable row level security;
grant select, insert on table public.community_post_comments to anon, authenticated;

create policy "Published community comments are readable" on public.community_post_comments
for select to anon, authenticated
using (exists (select 1 from public.community_posts where community_posts.id = community_post_comments.post_id and community_posts.status = 'published'));

create policy "Members comment on published community posts" on public.community_post_comments
for insert to authenticated
with check (author_id = (select auth.uid()) and exists (select 1 from public.community_posts where community_posts.id = community_post_comments.post_id and community_posts.status = 'published'));
