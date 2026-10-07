alter table public.community_posts
  add column is_anonymous boolean not null default false;

alter table public.community_posts
  add constraint community_posts_anonymous_free_board_only
  check (not is_anonymous or category_slug = 'free-board');
