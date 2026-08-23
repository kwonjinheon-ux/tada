-- Keep historical category rows for existing posts, while making the revised
-- catalogue available to new posts and the UI.
-- The seeded legacy categories already occupy sort positions that this
-- migration introduces. Move them aside first so the insert remains safe on
-- databases populated from the initial community seed.
update public.community_categories
set sort_order = sort_order + 1000
where slug in (
  'free-stuff',
  'lost-found',
  'parents-kids',
  'jobs-services',
  'housing-flatmates',
  'study-language',
  'clubs-meetups'
);

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
