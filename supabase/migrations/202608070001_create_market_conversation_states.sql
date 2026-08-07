-- Per-participant inbox state for marketplace conversations.
--
-- A conversation has two participants, so archiving and deleting must be
-- one-sided: a buyer clearing their inbox must never destroy the seller's
-- record of the same trade. State therefore lives in its own row keyed by
-- (conversation_id, user_id) rather than as columns on the conversation.
--
-- Retention, as agreed with the product owner:
--   * A conversation the user has fully read and that has had no new message
--     for 30 days is removed from their inbox.
--   * Archiving exempts a conversation from that rule and instead gives it
--     60 days from the archive date. Archiving is how you keep something for
--     longer, so the archived copy always outlives the default.
--   * A new message resurrects the conversation for both sides, clearing the
--     archived and deleted marks, so neither participant can be silenced by
--     the other's housekeeping and nothing gets purged mid-negotiation.
--   * Once both participants have deleted, the underlying rows are removed.

create table public.market_conversation_states (
  conversation_id uuid not null references public.market_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  archived_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index market_conversation_states_user_idx
  on public.market_conversation_states (user_id);
create index market_conversation_states_archived_idx
  on public.market_conversation_states (archived_at)
  where archived_at is not null and deleted_at is null;

alter table public.market_conversation_states enable row level security;
revoke all on table public.market_conversation_states from anon, authenticated;
grant select, insert, update (archived_at, deleted_at, updated_at), delete
  on table public.market_conversation_states to authenticated;

create policy "Users read own conversation state"
on public.market_conversation_states for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Participants create own conversation state"
on public.market_conversation_states for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.market_conversations
    where market_conversations.id = market_conversation_states.conversation_id
      and (select auth.uid()) in (market_conversations.buyer_id, market_conversations.seller_id)
  )
);

create policy "Users update own conversation state"
on public.market_conversation_states for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users clear own conversation state"
on public.market_conversation_states for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.touch_market_conversation_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_market_conversation_state() from public;

create trigger market_conversation_states_touch
before update on public.market_conversation_states
for each row execute function public.touch_market_conversation_state();

-- Hard-delete the conversation only once nobody is holding a copy. Any state
-- row that is missing counts as "not deleted", so a participant who never
-- touched the conversation still keeps it.
create or replace function public.prune_orphaned_market_conversations(target_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  with deletable as (
    select conversation.id
    from public.market_conversations conversation
    where conversation.id = any(target_ids)
      and (
        select count(*)
        from public.market_conversation_states state
        where state.conversation_id = conversation.id
          and state.user_id in (conversation.buyer_id, conversation.seller_id)
          and state.deleted_at is not null
      ) = 2
  )
  delete from public.market_conversations
  where id in (select id from deletable);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_orphaned_market_conversations(uuid[]) from public;
grant execute on function public.prune_orphaned_market_conversations(uuid[]) to authenticated;

-- A new message pulls the conversation back into both inboxes.
create or replace function public.resurrect_market_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.market_conversation_states
  set archived_at = null, deleted_at = null, updated_at = now()
  where conversation_id = new.conversation_id
    and (archived_at is not null or deleted_at is not null);
  return new;
end;
$$;

revoke all on function public.resurrect_market_conversation() from public;

create trigger market_messages_resurrect_conversation
after insert on public.market_messages
for each row execute function public.resurrect_market_conversation();

-- Retention sweep. Safe to run repeatedly; returns how many inbox copies it
-- retired and how many conversations that let it remove outright.
create or replace function public.purge_expired_market_conversations()
returns table (retired integer, removed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  retired_count integer := 0;
  removed_count integer := 0;
  touched uuid[];
begin
  -- Rule 1: archived for more than 60 days.
  with expired as (
    update public.market_conversation_states state
    set deleted_at = now(), updated_at = now()
    where state.deleted_at is null
      and state.archived_at is not null
      and state.archived_at < now() - interval '60 days'
    returning state.conversation_id
  )
  select coalesce(array_agg(distinct conversation_id), '{}'), count(*)
  into touched, retired_count
  from expired;

  -- Rule 2: fully read and quiet for more than 30 days, and not archived.
  -- Archived conversations are exempt: they are governed by rule 1 only.
  with candidates as (
    select conversation.id as conversation_id, participant.user_id
    from public.market_conversations conversation
    cross join lateral (
      values (conversation.buyer_id), (conversation.seller_id)
    ) as participant(user_id)
    where coalesce(conversation.last_message_at, conversation.created_at) < now() - interval '30 days'
      and not exists (
        select 1 from public.market_messages message
        where message.conversation_id = conversation.id
          and message.recipient_id = participant.user_id
          and message.read_at is null
      )
      and not exists (
        select 1 from public.market_conversation_states state
        where state.conversation_id = conversation.id
          and state.user_id = participant.user_id
          and (state.archived_at is not null or state.deleted_at is not null)
      )
  ), inserted as (
    insert into public.market_conversation_states (conversation_id, user_id, deleted_at)
    select conversation_id, user_id, now() from candidates
    on conflict (conversation_id, user_id)
      do update set deleted_at = now(), updated_at = now()
    returning conversation_id
  )
  select touched || coalesce(array_agg(distinct conversation_id), '{}'), retired_count + count(*)
  into touched, retired_count
  from inserted;

  removed_count := public.prune_orphaned_market_conversations(touched);
  return query select retired_count, removed_count;
end;
$$;

revoke all on function public.purge_expired_market_conversations() from public;

-- Schedule the sweep if pg_cron is available. Where it is not, the function
-- above is the whole contract: call it from any scheduler once a day.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule('purge-expired-market-conversations')
    where exists (select 1 from cron.job where jobname = 'purge-expired-market-conversations');
    perform cron.schedule(
      'purge-expired-market-conversations',
      '20 3 * * *',
      $cron$select public.purge_expired_market_conversations();$cron$
    );
  end if;
end;
$$;
