create table public.market_message_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  avatar_path text,
  updated_at timestamptz not null default now()
);

alter table public.market_message_profiles enable row level security;

revoke all on table public.market_message_profiles from anon, authenticated;
grant select on table public.market_message_profiles to authenticated;

create policy "Conversation participants can read message profiles"
on public.market_message_profiles
for select to authenticated
using (
  exists (
    select 1
    from public.market_conversations
    where (select auth.uid()) in (buyer_id, seller_id)
      and market_message_profiles.id in (buyer_id, seller_id)
  )
);

create or replace function private.sync_market_message_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.market_message_profiles (id, display_name, avatar_path, updated_at)
  values (new.id, new.display_name, new.avatar_path, now())
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_path = excluded.avatar_path,
        updated_at = now();
  return new;
end;
$$;

revoke all on function private.sync_market_message_profile() from public;

create trigger profiles_sync_market_message_profile
after insert or update of display_name, avatar_path on public.profiles
for each row
execute function private.sync_market_message_profile();

insert into public.market_message_profiles (id, display_name, avatar_path)
select id, display_name, avatar_path
from public.profiles
where display_name is not null
on conflict (id) do update
  set display_name = excluded.display_name,
      avatar_path = excluded.avatar_path,
      updated_at = now();

create policy "Conversation participant avatars are readable"
on storage.objects
for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and exists (
    select 1
    from public.market_message_profiles
    join public.market_conversations
      on market_message_profiles.id in (
        market_conversations.buyer_id,
        market_conversations.seller_id
      )
    where market_message_profiles.avatar_path = storage.objects.name
      and (select auth.uid()) in (
        market_conversations.buyer_id,
        market_conversations.seller_id
      )
  )
);
