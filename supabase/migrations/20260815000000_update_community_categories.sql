-- Keep historical category rows for existing posts, while making the revised
-- catalogue available to new posts and the UI.
update public.community_categories
set label = 'New Zealand Life'
where slug = 'local-noticeboard';

insert into public.community_categories (slug, label, sort_order) values
  ('together', 'Let''s Do It Together', 50),
  ('immigration', 'Immigration', 60),
  ('visa', 'Visa', 70),
  ('working-holiday', 'Working Holiday', 80)
on conflict (slug) do update
set label = excluded.label,
    sort_order = excluded.sort_order;
