create schema if not exists private;

create table public.bargain_comment_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  avatar_path text,
  updated_at timestamptz not null default now()
);

create table public.bargain_listing_comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.bargain_listings(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.bargain_listing_comments(id) on delete cascade,
  depth smallint not null default 0 check (depth between 0 and 2),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.bargain_listing_comment_votes (
  comment_id uuid not null references public.bargain_listing_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index bargain_listing_comments_listing_root_idx
  on public.bargain_listing_comments (listing_id, score desc, created_at desc)
  where parent_id is null;
create index bargain_listing_comments_parent_idx
  on public.bargain_listing_comments (parent_id, created_at asc);
create index bargain_listing_comments_author_idx
  on public.bargain_listing_comments (author_id, created_at desc);
create index bargain_listing_comment_votes_comment_idx
  on public.bargain_listing_comment_votes (comment_id);

alter table public.bargain_comment_profiles enable row level security;
alter table public.bargain_listing_comments enable row level security;
alter table public.bargain_listing_comment_votes enable row level security;

revoke all on table public.bargain_comment_profiles from anon, authenticated;
revoke all on table public.bargain_listing_comments from anon, authenticated;
revoke all on table public.bargain_listing_comment_votes from anon, authenticated;

grant select on table public.bargain_comment_profiles to anon, authenticated;
grant select on table public.bargain_listing_comments to anon, authenticated;
grant insert, update on table public.bargain_listing_comments to authenticated;
grant select, insert, update, delete on table public.bargain_listing_comment_votes to authenticated;

revoke update on table public.bargain_listing_comments from authenticated;
grant update (body, updated_at, deleted_at) on table public.bargain_listing_comments to authenticated;

create policy "Bargain commenter profiles are readable" on public.bargain_comment_profiles
for select to anon, authenticated
using (
  exists (
    select 1 from public.bargain_listing_comments
    where bargain_listing_comments.author_id = bargain_comment_profiles.id
  )
);

create policy "Visible bargain listing comments are readable" on public.bargain_listing_comments
for select to anon, authenticated
using (
  exists (
    select 1 from public.bargain_listings
    where bargain_listings.id = bargain_listing_comments.listing_id
      and bargain_listings.status in ('published', 'pending', 'sold')
  )
);

create policy "Members can comment on active bargain listings" on public.bargain_listing_comments
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.bargain_listings
    where bargain_listings.id = bargain_listing_comments.listing_id
      and bargain_listings.status in ('published', 'pending')
  )
);

create policy "Authors can edit their bargain comments" on public.bargain_listing_comments
for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy "Members can read their bargain comment votes" on public.bargain_listing_comment_votes
for select to authenticated using (user_id = (select auth.uid()));
create policy "Members can cast their own bargain comment votes" on public.bargain_listing_comment_votes
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Members can change their own bargain comment votes" on public.bargain_listing_comment_votes
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members can remove their own bargain comment votes" on public.bargain_listing_comment_votes
for delete to authenticated using (user_id = (select auth.uid()));

create or replace function private.sync_bargain_comment_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.bargain_comment_profiles (id, display_name, avatar_path, updated_at)
  values (new.id, new.display_name, new.avatar_path, now())
  on conflict (id) do update set display_name = excluded.display_name, avatar_path = excluded.avatar_path, updated_at = excluded.updated_at;
  return new;
end;
$$;
revoke all on function private.sync_bargain_comment_profile() from public;

create trigger profiles_sync_bargain_comment_profile
after insert or update of display_name, avatar_path on public.profiles
for each row execute function private.sync_bargain_comment_profile();

insert into public.bargain_comment_profiles (id, display_name, avatar_path)
select id, display_name, avatar_path from public.profiles where display_name is not null
on conflict (id) do update set display_name = excluded.display_name, avatar_path = excluded.avatar_path, updated_at = now();

create or replace function private.prepare_bargain_listing_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare parent_comment public.bargain_listing_comments;
begin
  new.body := trim(new.body);
  if new.parent_id is null then new.depth := 0; return new; end if;

  select * into parent_comment from public.bargain_listing_comments where id = new.parent_id;
  if not found then raise exception 'The parent comment no longer exists.'; end if;
  if parent_comment.listing_id <> new.listing_id then raise exception 'Replies must belong to the same listing.'; end if;
  if parent_comment.depth >= 2 then raise exception 'Replies are limited to three levels.'; end if;
  new.depth := parent_comment.depth + 1;
  return new;
end;
$$;
revoke all on function private.prepare_bargain_listing_comment() from public;

create trigger bargain_listing_comments_prepare_before_write
before insert or update of body, parent_id, listing_id on public.bargain_listing_comments
for each row execute function private.prepare_bargain_listing_comment();

create or replace function private.refresh_bargain_listing_comment_score()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_comment_id uuid := coalesce(new.comment_id, old.comment_id);
begin
  update public.bargain_listing_comments
  set score = coalesce((select sum(value)::integer from public.bargain_listing_comment_votes where comment_id = target_comment_id), 0)
  where id = target_comment_id;
  return coalesce(new, old);
end;
$$;
revoke all on function private.refresh_bargain_listing_comment_score() from public;

create trigger bargain_listing_comment_votes_refresh_score
after insert or update or delete on public.bargain_listing_comment_votes
for each row execute function private.refresh_bargain_listing_comment_score();

create policy "Bargain commenter avatars are readable" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'profile-avatars'
  and exists (
    select 1
    from public.bargain_comment_profiles
    join public.bargain_listing_comments on bargain_listing_comments.author_id = bargain_comment_profiles.id
    where bargain_comment_profiles.avatar_path = storage.objects.name
  )
);
