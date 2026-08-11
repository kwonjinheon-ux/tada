create table public.community_categories (
  slug text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null check (char_length(trim(label)) between 2 and 80),
  sort_order integer not null unique,
  created_at timestamptz not null default now()
);

insert into public.community_categories (slug, label, sort_order) values
  ('local-noticeboard', 'Local Noticeboard', 10),
  ('events', 'Events', 20),
  ('qna', 'Q&A', 30),
  ('recommendations', 'Recommendations', 40),
  ('free-stuff', 'Buy Nothing / Free Stuff', 50),
  ('lost-found', 'Lost & Found', 60),
  ('parents-kids', 'Parents & Kids', 70),
  ('jobs-services', 'Jobs & Services', 80),
  ('housing-flatmates', 'Housing & Flatmates', 90),
  ('study-language', 'Study & Language', 100),
  ('clubs-meetups', 'Clubs & Meetups', 110)
on conflict (slug) do update set label = excluded.label, sort_order = excluded.sort_order;

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category_slug text not null references public.community_categories(slug) on update cascade,
  post_type text not null check (post_type in ('event', 'question', 'recommendation', 'free', 'notice', 'housing')),
  title text not null check (char_length(trim(title)) between 4 and 120),
  body text not null check (char_length(trim(body)) between 20 and 5000),
  region_city text not null check (char_length(trim(region_city)) between 2 and 80),
  region_suburb text check (region_suburb is null or char_length(trim(region_suburb)) between 2 and 80),
  status text not null default 'published' check (status in ('published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_posts_browse_idx on public.community_posts (status, category_slug, created_at desc);
create index community_posts_author_idx on public.community_posts (author_id, created_at desc);

alter table public.community_categories enable row level security;
alter table public.community_posts enable row level security;

create policy "Community categories are readable" on public.community_categories for select to anon, authenticated using (true);
create policy "Published community posts are readable" on public.community_posts for select to anon, authenticated using (status = 'published' or author_id = (select auth.uid()));
create policy "Users create own community posts" on public.community_posts for insert to authenticated with check (author_id = (select auth.uid()));
create policy "Users update own community posts" on public.community_posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "Users delete own community posts" on public.community_posts for delete to authenticated using (author_id = (select auth.uid()));

create or replace function public.touch_community_posts_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger community_posts_touch_updated_at before update on public.community_posts for each row execute function public.touch_community_posts_updated_at();
