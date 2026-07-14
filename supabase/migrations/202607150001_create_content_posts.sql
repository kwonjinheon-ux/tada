create type public.content_post_status as enum ('draft', 'published', 'archived');

create table public.content_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  service_key text not null default 'general' check (service_key ~ '^[a-z][a-z0-9_-]{1,39}$'),
  post_type text not null default 'offer' check (post_type ~ '^[a-z][a-z0-9_-]{1,39}$'),
  status public.content_post_status not null default 'draft',
  title text not null check (char_length(trim(title)) between 4 and 120),
  body text not null check (char_length(trim(body)) between 20 and 5000),
  region_city text check (region_city is null or char_length(trim(region_city)) between 2 and 80),
  region_suburb text check (region_suburb is null or char_length(trim(region_suburb)) between 2 and 80),
  contact_method text not null default 'in_app' check (contact_method in ('in_app', 'email', 'phone')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_posts_browse_idx on public.content_posts (status, service_key, post_type, created_at desc);
create index content_posts_author_idx on public.content_posts (author_id, created_at desc);
create index content_posts_payload_idx on public.content_posts using gin (payload);

alter table public.content_posts enable row level security;

create policy "Published content posts are readable" on public.content_posts
for select
to anon, authenticated
using (status = 'published' or (select auth.uid()) = author_id);

create policy "Users create own content posts" on public.content_posts
for insert
to authenticated
with check ((select auth.uid()) = author_id);

create policy "Users update own content posts" on public.content_posts
for update
to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

create policy "Users delete own content posts" on public.content_posts
for delete
to authenticated
using ((select auth.uid()) = author_id);

create or replace function public.touch_content_posts_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger content_posts_touch_updated_at
before update on public.content_posts
for each row
execute function public.touch_content_posts_updated_at();
