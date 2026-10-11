alter table public.community_posts
  drop constraint community_posts_anonymous_free_board_only,
  add constraint community_posts_anonymous_allowed_categories
    check (not is_anonymous or category_slug in ('free-board', 'qna'));
