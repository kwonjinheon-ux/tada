-- Preserve existing posts in retired categories while assigning a distinct,
-- stable ordering to the revised community category menu.
update public.community_categories
set sort_order = sort_order + 1000
where slug in ('free-stuff', 'lost-found', 'parents-kids', 'jobs-services', 'housing-flatmates', 'study-language', 'clubs-meetups', 'visa', 'working-holiday');

update public.community_categories
-- Use a separate range from the legacy categories moved above so the
-- temporary values remain unique on an already-seeded database.
set sort_order = sort_order + 3000
where slug in ('local-noticeboard', 'events', 'qna', 'recommendations', 'together', 'immigration');

insert into public.community_categories (slug, label, sort_order) values
  ('qna', 'Q&A', 20),
  ('free-board', 'Free Board', 30),
  ('local-noticeboard', 'New Zealand Life', 40),
  ('events', 'Events', 50),
  ('recommendations', 'Recommendations', 60),
  ('together', 'Let''s Do It Together', 70),
  ('immigration', 'Immigration, Visa & Working Holiday', 80)
on conflict (slug) do update
set label = excluded.label,
    sort_order = excluded.sort_order;
