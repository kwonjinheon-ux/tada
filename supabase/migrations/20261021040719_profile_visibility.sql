-- The full marketplace profile can be limited without hiding the seller's
-- basic name and avatar on a published listing or an existing review.
alter table public.profiles
  add column if not exists profile_visibility text not null default 'public'
    check (profile_visibility in ('public', 'members', 'trade_partners'));

alter table public.market_seller_profiles
  add column if not exists profile_visibility text not null default 'public'
    check (profile_visibility in ('public', 'members', 'trade_partners'));

-- Public surfaces need a deliberately small identity projection. The profiles
-- table also holds phone and precise location, so it must not stay public.
create table if not exists public.public_member_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  avatar_path text,
  region_city text,
  region_suburb text,
  profile_visibility text not null default 'public'
    check (profile_visibility in ('public', 'members', 'trade_partners')),
  updated_at timestamptz not null default now()
);

alter table public.public_member_profiles enable row level security;
revoke all on table public.public_member_profiles from public, anon, authenticated;
grant select on table public.public_member_profiles to anon, authenticated;
create policy "Public member identity is readable"
on public.public_member_profiles for select to anon, authenticated using (true);

insert into public.public_member_profiles (id, display_name, avatar_path, region_city, region_suburb, profile_visibility)
select id, coalesce(display_name, 'Tada member'), avatar_path, region_city, region_suburb, profile_visibility
from public.profiles
on conflict (id) do update set
  display_name = excluded.display_name,
  avatar_path = excluded.avatar_path,
  region_city = excluded.region_city,
  region_suburb = excluded.region_suburb,
  profile_visibility = excluded.profile_visibility,
  updated_at = now();

create or replace function private.sync_public_member_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.public_member_profiles (id, display_name, avatar_path, region_city, region_suburb, profile_visibility, updated_at)
  values (new.id, coalesce(new.display_name, 'Tada member'), new.avatar_path, new.region_city, new.region_suburb, new.profile_visibility, now())
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_path = excluded.avatar_path,
    region_city = excluded.region_city,
    region_suburb = excluded.region_suburb,
    profile_visibility = excluded.profile_visibility,
    updated_at = now();
  return new;
end;
$$;
revoke all on function private.sync_public_member_profile() from public;
create trigger profiles_sync_public_member_profile
after insert or update of display_name, avatar_path, region_city, region_suburb, profile_visibility on public.profiles
for each row execute function private.sync_public_member_profile();

update public.market_seller_profiles seller
set profile_visibility = profile.profile_visibility
from public.profiles profile
where seller.id = profile.id;

create or replace function public.sync_market_seller_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.market_seller_profiles (id, display_name, avatar_path, profile_visibility, updated_at)
  values (new.id, new.display_name, new.avatar_path, new.profile_visibility, now())
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_path = excluded.avatar_path,
        profile_visibility = excluded.profile_visibility,
        updated_at = now();
  return new;
end;
$$;

revoke all on function public.sync_market_seller_profile() from public;

drop trigger if exists profiles_sync_market_seller_profile on public.profiles;
create trigger profiles_sync_market_seller_profile
after insert or update of display_name, avatar_path, profile_visibility on public.profiles
for each row execute function public.sync_market_seller_profile();

drop policy if exists "Public profiles are readable" on public.profiles;
revoke select on table public.profiles from public, anon;
grant select on table public.profiles to authenticated;
