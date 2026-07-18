alter table public.profiles
  add column if not exists avatar_path text;

create table if not exists public.market_seller_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  avatar_path text,
  updated_at timestamptz not null default now()
);

alter table public.market_seller_profiles enable row level security;

drop policy if exists "Published seller profiles are readable" on public.market_seller_profiles;
create policy "Published seller profiles are readable" on public.market_seller_profiles
for select to anon, authenticated
using (
  exists (
    select 1
    from public.market_listings
    where market_listings.owner_id = market_seller_profiles.id
      and market_listings.status = 'published'
  )
);

create or replace function public.sync_market_seller_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.market_seller_profiles (id, display_name, avatar_path, updated_at)
  values (new.id, new.display_name, new.avatar_path, now())
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_path = excluded.avatar_path,
        updated_at = excluded.updated_at;
  return new;
end;
$$;

revoke all on function public.sync_market_seller_profile() from public;

drop trigger if exists profiles_sync_market_seller_profile on public.profiles;
create trigger profiles_sync_market_seller_profile
after insert or update of display_name, avatar_path on public.profiles
for each row
execute function public.sync_market_seller_profile();

insert into public.market_seller_profiles (id, display_name, avatar_path)
select id, display_name, avatar_path
from public.profiles
where display_name is not null
on conflict (id) do update
  set display_name = excluded.display_name,
      avatar_path = excluded.avatar_path,
      updated_at = now();

drop policy if exists "Published seller avatars are readable" on storage.objects;
create policy "Published seller avatars are readable" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'profile-avatars'
  and exists (
    select 1
    from public.market_seller_profiles
    join public.market_listings on market_listings.owner_id = market_seller_profiles.id
    where market_seller_profiles.avatar_path = storage.objects.name
      and market_listings.status = 'published'
  )
);
