-- Keep the existing inbox (and its read/delete behaviour) while allowing
-- community and service events to appear beside marketplace notifications.
alter table public.market_notifications
  drop constraint if exists market_notifications_type_check,
  drop constraint if exists market_notifications_href_check;

alter table public.market_notifications
  add constraint market_notifications_type_check
    check (type in ('message', 'offer', 'trade', 'keyword', 'wishlist', 'community', 'service_review')),
  add constraint market_notifications_href_check
    check (href = '/market' or href like '/market/%' or href like '/community/%' or href like '/services/%'),
  add column community_post_id uuid references public.community_posts(id) on delete cascade,
  add column community_comment_id uuid references public.community_post_comments(id) on delete cascade,
  add column service_listing_id uuid references public.service_listings(id) on delete cascade,
  add column service_review_id uuid references public.service_reviews(id) on delete cascade;

create index market_notifications_community_post_idx
  on public.market_notifications (community_post_id)
  where community_post_id is not null;
create index market_notifications_service_listing_idx
  on public.market_notifications (service_listing_id)
  where service_listing_id is not null;

-- Absence of a row means the launch defaults (all optional categories on).
-- Messages, offers and transaction progress deliberately have no kill switch.
create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  keyword_enabled boolean not null default true,
  wishlist_enabled boolean not null default true,
  community_enabled boolean not null default true,
  service_reviews_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
revoke all on table public.notification_preferences from anon, authenticated;
grant select, insert, update (keyword_enabled, wishlist_enabled, community_enabled, service_reviews_enabled, updated_at)
  on table public.notification_preferences to authenticated;

create policy "Users read own notification preferences"
on public.notification_preferences for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create own notification preferences"
on public.notification_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update own notification preferences"
on public.notification_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Central gate also covers existing keyword/wishlist producer triggers. It
-- suppresses future optional alerts only; previously delivered rows remain.
create or replace function private.filter_optional_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.notification_preferences p
    where p.user_id = new.user_id
      and (
        (new.type = 'keyword' and not p.keyword_enabled)
        or (new.type = 'wishlist' and not p.wishlist_enabled)
        or (new.type = 'community' and not p.community_enabled)
        or (new.type = 'service_review' and not p.service_reviews_enabled)
      )
  ) then
    return null;
  end if;
  return new;
end;
$$;
revoke all on function private.filter_optional_notification() from public, anon, authenticated;

create trigger market_notifications_filter_optional_before_insert
before insert on public.market_notifications
for each row execute function private.filter_optional_notification();

create or replace function private.notify_community_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  post_owner uuid;
  post_title text;
  post_status text;
  parent_author uuid;
begin
  select author_id, title, status into post_owner, post_title, post_status
  from public.community_posts where id = new.post_id;
  if post_status is distinct from 'published' then return new; end if;

  if new.parent_id is not null then
    select author_id into parent_author
    from public.community_post_comments where id = new.parent_id;
  end if;

  if post_owner is not null and post_owner <> new.author_id then
    insert into public.market_notifications (
      user_id, actor_id, type, title, body, href,
      community_post_id, community_comment_id, dedupe_key, metadata
    ) values (
      post_owner, new.author_id, 'community',
      case when parent_author = post_owner then 'New reply to your comment' else 'New comment on your post' end,
      left(new.body, 180),
      '/community/' || new.post_id || '#comment-' || new.id,
      new.post_id, new.id, 'community:post:' || new.id,
      jsonb_build_object('event', case when parent_author = post_owner then 'comment_reply' else 'post_comment' end, 'postTitle', post_title)
    ) on conflict (user_id, dedupe_key) do nothing;
  end if;

  if parent_author is not null
     and parent_author <> new.author_id
     and parent_author is distinct from post_owner then
    insert into public.market_notifications (
      user_id, actor_id, type, title, body, href,
      community_post_id, community_comment_id, dedupe_key, metadata
    ) values (
      parent_author, new.author_id, 'community',
      'New reply to your comment', left(new.body, 180),
      '/community/' || new.post_id || '#comment-' || new.id,
      new.post_id, new.id, 'community:reply:' || new.id,
      jsonb_build_object('event', 'comment_reply', 'postTitle', post_title)
    ) on conflict (user_id, dedupe_key) do nothing;
  end if;

  return new;
end;
$$;
revoke all on function private.notify_community_comment() from public, anon, authenticated;
create trigger community_comments_notify_after_insert
after insert on public.community_post_comments
for each row execute function private.notify_community_comment();

create or replace function private.notify_service_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  service_owner uuid;
  service_name text;
  service_status public.service_listing_status;
begin
  select owner_id, coalesce(business_name, provider_name), status
    into service_owner, service_name, service_status
  from public.service_listings where id = new.service_id;

  if service_owner is null or service_owner = new.reviewer_id
     or service_status is distinct from 'published' then return new; end if;

  insert into public.market_notifications (
    user_id, actor_id, type, title, body, href,
    service_listing_id, service_review_id, dedupe_key, metadata
  ) values (
    service_owner, new.reviewer_id, 'service_review',
    'New review for your service', left(new.comment, 180),
    '/services/' || new.service_id || '#review-' || new.id,
    new.service_id, new.id, 'service:review:' || new.id,
    jsonb_build_object('serviceName', service_name, 'rating', new.rating)
  ) on conflict (user_id, dedupe_key) do nothing;
  return new;
end;
$$;
revoke all on function private.notify_service_review() from public, anon, authenticated;
create trigger service_reviews_notify_after_insert
after insert on public.service_reviews
for each row execute function private.notify_service_review();

-- Comments are soft-deleted; remove their deep links once they disappear.
create or replace function private.delete_soft_deleted_comment_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    delete from public.market_notifications where community_comment_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.delete_soft_deleted_comment_notifications() from public, anon, authenticated;
create trigger community_comments_clear_notifications_after_delete
after update of deleted_at on public.community_post_comments
for each row execute function private.delete_soft_deleted_comment_notifications();

create or replace function private.clear_unavailable_content_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'community_posts' and new.status <> 'published' then
    delete from public.market_notifications where community_post_id = new.id;
  elsif tg_table_name = 'service_listings' and new.status <> 'published' then
    delete from public.market_notifications where service_listing_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.clear_unavailable_content_notifications() from public, anon, authenticated;
create trigger community_posts_clear_notifications_after_unpublish
after update of status on public.community_posts
for each row execute function private.clear_unavailable_content_notifications();
create trigger service_listings_clear_notifications_after_unpublish
after update of status on public.service_listings
for each row execute function private.clear_unavailable_content_notifications();
