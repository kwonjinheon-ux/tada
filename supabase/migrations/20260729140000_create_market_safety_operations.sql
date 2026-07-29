-- Safety and operations foundation. Assign the first admin only from the Supabase SQL editor:
-- insert into public.user_roles (user_id, role) values ('<auth-user-uuid>', 'admin');

create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

create or replace function public.market_is_moderator()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

revoke all on function public.market_is_moderator() from public, anon;
grant execute on function public.market_is_moderator() to authenticated;

create policy "Users can read their own market role"
on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Moderators can read market roles"
on public.user_roles for select to authenticated
using ((select public.market_is_moderator()));

create table public.market_user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index market_user_blocks_blocked_idx on public.market_user_blocks (blocked_id, blocker_id);
alter table public.market_user_blocks enable row level security;
revoke all on public.market_user_blocks from anon, authenticated;
grant select, insert, delete on public.market_user_blocks to authenticated;

create policy "Users manage their own blocks"
on public.market_user_blocks for all to authenticated
using ((select auth.uid()) = blocker_id)
with check ((select auth.uid()) = blocker_id);

create or replace function public.market_users_are_blocked(p_first_user uuid, p_second_user uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.market_user_blocks
    where (blocker_id = p_first_user and blocked_id = p_second_user)
       or (blocker_id = p_second_user and blocked_id = p_first_user)
  );
$$;

revoke all on function public.market_users_are_blocked(uuid, uuid) from public, anon, authenticated;

create table public.market_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'user', 'comment', 'message')),
  target_id uuid not null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason text not null check (reason in ('fraud', 'prohibited_item', 'harassment', 'spam', 'inappropriate_content', 'other')),
  details text check (details is null or char_length(trim(details)) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_note text check (reviewer_note is null or char_length(trim(reviewer_note)) <= 1000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index market_reports_review_queue_idx on public.market_reports (status, created_at asc);
create index market_reports_target_idx on public.market_reports (target_type, target_id);
alter table public.market_reports enable row level security;
revoke all on public.market_reports from anon, authenticated;
grant select, insert on public.market_reports to authenticated;
grant update (status, reviewer_id, reviewer_note, reviewed_at, updated_at) on public.market_reports to authenticated;

create or replace function public.prepare_market_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_owner uuid;
begin
  if auth.uid() is null or new.reporter_id <> auth.uid() then
    raise exception 'Reports must be submitted by the signed-in user.';
  end if;

  case new.target_type
    when 'listing' then
      select owner_id into target_owner from public.market_listings where id = new.target_id;
    when 'user' then
      select id into target_owner from public.profiles where id = new.target_id;
    when 'comment' then
      select author_id into target_owner from public.market_listing_comments where id = new.target_id;
    when 'message' then
      select sender_id into target_owner from public.market_messages where id = new.target_id;
  end case;

  if target_owner is null then
    raise exception 'The reported item no longer exists.';
  end if;
  if target_owner = new.reporter_id then
    raise exception 'You cannot report your own content.';
  end if;

  new.reported_user_id := target_owner;
  new.details := nullif(trim(coalesce(new.details, '')), '');
  new.status := 'open';
  new.reviewer_id := null;
  new.reviewer_note := null;
  new.reviewed_at := null;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.prepare_market_report() from public, anon, authenticated;
create trigger market_reports_prepare_before_insert
before insert on public.market_reports
for each row execute function public.prepare_market_report();

create policy "Users can submit and read their own reports"
on public.market_reports for select to authenticated
using ((select auth.uid()) = reporter_id);

create policy "Users can submit reports"
on public.market_reports for insert to authenticated
with check ((select auth.uid()) = reporter_id);

create policy "Moderators can review reports"
on public.market_reports for all to authenticated
using ((select public.market_is_moderator()))
with check ((select public.market_is_moderator()));

create table public.market_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.market_reports(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_listing_id uuid references public.market_listings(id) on delete set null,
  action_type text not null check (action_type in ('warning', 'suspension', 'listing_hidden', 'listing_restored')),
  note text check (note is null or char_length(trim(note)) <= 1000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  revoked_at timestamptz,
  moderator_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index market_moderation_actions_target_idx on public.market_moderation_actions (target_user_id, starts_at desc);
create index market_moderation_actions_active_idx on public.market_moderation_actions (target_user_id, ends_at) where revoked_at is null;
alter table public.market_moderation_actions enable row level security;
revoke all on public.market_moderation_actions from anon, authenticated;
grant select, insert, update (revoked_at) on public.market_moderation_actions to authenticated;

create policy "Moderators manage moderation actions"
on public.market_moderation_actions for all to authenticated
using ((select public.market_is_moderator()))
with check ((select public.market_is_moderator()));

create or replace function public.market_user_is_active()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select auth.uid() is not null and not exists (
    select 1 from public.market_moderation_actions
    where target_user_id = auth.uid()
      and action_type = 'suspension'
      and revoked_at is null
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
  );
$$;

revoke all on function public.market_user_is_active() from public, anon, authenticated;

create table public.market_rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index market_rate_limit_events_lookup_idx on public.market_rate_limit_events (user_id, action, created_at desc);
alter table public.market_rate_limit_events enable row level security;
revoke all on public.market_rate_limit_events from anon, authenticated;

create or replace function public.consume_market_rate_limit(p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  max_requests integer;
  window_size interval;
  request_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  case p_action
    when 'report' then max_requests := 5; window_size := interval '1 hour';
    when 'block' then max_requests := 20; window_size := interval '1 hour';
    when 'conversation' then max_requests := 10; window_size := interval '1 minute';
    when 'message' then max_requests := 30; window_size := interval '1 minute';
    when 'comment' then max_requests := 10; window_size := interval '1 minute';
    else raise exception 'Unknown rate limit action.';
  end case;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || p_action, 0));
  select count(*) into request_count
  from public.market_rate_limit_events
  where user_id = current_user_id and action = p_action and created_at >= now() - window_size;

  if request_count >= max_requests then return false; end if;
  insert into public.market_rate_limit_events (user_id, action) values (current_user_id, p_action);
  return true;
end;
$$;

revoke all on function public.consume_market_rate_limit(text) from public, anon;
grant execute on function public.consume_market_rate_limit(text) to authenticated;

-- Restrictive policies are combined with existing ownership policies and protect direct Data API access.
create policy "Suspended users cannot create listings"
on public.market_listings as restrictive for insert to authenticated
with check ((select public.market_user_is_active()));

create policy "Suspended users cannot start conversations"
on public.market_conversations as restrictive for insert to authenticated
with check ((select public.market_user_is_active()));

create policy "Suspended users cannot send messages"
on public.market_messages as restrictive for insert to authenticated
with check ((select public.market_user_is_active()));

create policy "Suspended users cannot comment"
on public.market_listing_comments as restrictive for insert to authenticated
with check ((select public.market_user_is_active()));

create or replace function public.validate_market_conversation_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  listing_owner_id uuid;
  listing_status public.market_listing_status;
begin
  if current_user_id is null or new.buyer_id <> current_user_id then
    raise exception 'The signed-in buyer must own the conversation.';
  end if;
  if not public.market_user_is_active() then raise exception 'Your marketplace access is currently restricted.'; end if;

  select owner_id, status into listing_owner_id, listing_status from public.market_listings where id = new.listing_id;
  if not found or listing_status <> 'published' then raise exception 'This listing is not available for conversations.'; end if;
  if new.seller_id <> listing_owner_id or new.seller_id = current_user_id then raise exception 'The conversation seller must own the listing.'; end if;
  if public.market_users_are_blocked(current_user_id, listing_owner_id) then raise exception 'Messaging is unavailable between these accounts.'; end if;
  return new;
end;
$$;

create or replace function public.prepare_market_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation public.market_conversations;
begin
  if new.sender_id <> auth.uid() then raise exception 'Messages must be sent by the signed-in user.'; end if;
  if not public.market_user_is_active() then raise exception 'Your marketplace access is currently restricted.'; end if;
  select * into conversation from public.market_conversations where id = new.conversation_id;
  if not found or new.sender_id not in (conversation.buyer_id, conversation.seller_id) then raise exception 'You are not a participant in this conversation.'; end if;
  if public.market_users_are_blocked(conversation.buyer_id, conversation.seller_id) then raise exception 'Messaging is unavailable between these accounts.'; end if;
  new.recipient_id := case when new.sender_id = conversation.buyer_id then conversation.seller_id else conversation.buyer_id end;
  new.body := trim(new.body);
  return new;
end;
$$;
