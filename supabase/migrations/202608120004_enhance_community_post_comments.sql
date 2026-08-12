alter table public.community_post_comments
  add column parent_id uuid references public.community_post_comments(id) on delete cascade,
  add column depth smallint not null default 0 check (depth between 0 and 2),
  add column score integer not null default 0,
  add column deleted_at timestamptz;

create table public.community_post_comment_votes (
  comment_id uuid not null references public.community_post_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table public.community_comment_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  avatar_path text,
  updated_at timestamptz not null default now()
);

create index community_post_comments_parent_idx on public.community_post_comments (parent_id, created_at asc);
create index community_post_comment_votes_comment_idx on public.community_post_comment_votes (comment_id);

alter table public.community_post_comment_votes enable row level security;
alter table public.community_comment_profiles enable row level security;
grant select on public.community_comment_profiles to anon, authenticated;
grant select, insert, update, delete on public.community_post_comment_votes to authenticated;
grant update (body, updated_at, deleted_at) on public.community_post_comments to authenticated;

create policy "Community commenter profiles are readable" on public.community_comment_profiles for select to anon, authenticated using (exists (select 1 from public.community_post_comments where community_post_comments.author_id = community_comment_profiles.id));
create policy "Community comment authors can update" on public.community_post_comments for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "Community members read votes" on public.community_post_comment_votes for select to authenticated using (user_id = (select auth.uid()));
create policy "Community members cast votes" on public.community_post_comment_votes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Community members update votes" on public.community_post_comment_votes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Community members delete votes" on public.community_post_comment_votes for delete to authenticated using (user_id = (select auth.uid()));

create or replace function private.sync_community_comment_profile() returns trigger language plpgsql security definer set search_path = '' as $$ begin insert into public.community_comment_profiles (id, display_name, avatar_path, updated_at) values (new.id, new.display_name, new.avatar_path, now()) on conflict (id) do update set display_name = excluded.display_name, avatar_path = excluded.avatar_path, updated_at = now(); return new; end; $$;
revoke all on function private.sync_community_comment_profile() from public;
create trigger profiles_sync_community_comment_profile after insert or update of display_name, avatar_path on public.profiles for each row execute function private.sync_community_comment_profile();
insert into public.community_comment_profiles (id, display_name, avatar_path) select id, display_name, avatar_path from public.profiles where display_name is not null on conflict (id) do update set display_name = excluded.display_name, avatar_path = excluded.avatar_path, updated_at = now();

create or replace function private.prepare_community_post_comment() returns trigger language plpgsql security definer set search_path = '' as $$ declare parent_comment public.community_post_comments; begin new.body := trim(new.body); if new.parent_id is null then new.depth := 0; return new; end if; select * into parent_comment from public.community_post_comments where id = new.parent_id; if not found or parent_comment.post_id <> new.post_id then raise exception 'Replies must belong to the same post.'; end if; if parent_comment.depth >= 2 then raise exception 'Replies are limited to three levels.'; end if; new.depth := parent_comment.depth + 1; return new; end; $$;
revoke all on function private.prepare_community_post_comment() from public;
create trigger community_post_comments_prepare_before_write before insert or update of body, parent_id, post_id on public.community_post_comments for each row execute function private.prepare_community_post_comment();

create or replace function private.refresh_community_post_comment_score() returns trigger language plpgsql security definer set search_path = '' as $$ declare target_id uuid := coalesce(new.comment_id, old.comment_id); begin update public.community_post_comments set score = coalesce((select sum(value)::integer from public.community_post_comment_votes where comment_id = target_id), 0) where id = target_id; return coalesce(new, old); end; $$;
revoke all on function private.refresh_community_post_comment_score() from public;
create trigger community_post_comment_votes_refresh_score after insert or update or delete on public.community_post_comment_votes for each row execute function private.refresh_community_post_comment_score();
