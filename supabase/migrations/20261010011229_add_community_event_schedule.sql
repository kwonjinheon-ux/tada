alter table public.community_posts
  add column event_start_at timestamptz,
  add column event_end_at timestamptz;

alter table public.community_posts
  add constraint community_posts_event_schedule_valid
  check (
    (event_start_at is null and event_end_at is null)
    or (
      category_slug = 'events'
      and event_start_at is not null
      and event_end_at is not null
      and event_end_at > event_start_at
    )
  );

create index community_posts_event_schedule_idx
  on public.community_posts (event_start_at)
  where category_slug = 'events' and status = 'published';
