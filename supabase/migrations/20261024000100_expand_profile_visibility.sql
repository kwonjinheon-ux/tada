-- Expand seller profile visibility to the five product choices.
-- Interested users are members who have favourited one of the seller's
-- published listings or started a market conversation with the seller.

create table if not exists public.public_member_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  avatar_path text,
  region_city text,
  region_suburb text,
  profile_visibility text not null default 'public',
  updated_at timestamptz not null default now()
);

do $$ declare constraint_row record; begin
  for constraint_row in select conname from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%profile_visibility%' loop
    execute format('alter table public.profiles drop constraint %I', constraint_row.conname);
  end loop;
end $$;
do $$ declare constraint_row record; begin
  for constraint_row in select conname from pg_constraint where conrelid = 'public.market_seller_profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%profile_visibility%' loop
    execute format('alter table public.market_seller_profiles drop constraint %I', constraint_row.conname);
  end loop;
end $$;
do $$ declare constraint_row record; begin
  for constraint_row in select conname from pg_constraint where conrelid = 'public.public_member_profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%profile_visibility%' loop
    execute format('alter table public.public_member_profiles drop constraint %I', constraint_row.conname);
  end loop;
end $$;

alter table public.profiles
  add column if not exists profile_visibility text not null default 'public';

alter table public.market_seller_profiles
  add column if not exists profile_visibility text not null default 'public';

alter table public.public_member_profiles
  add column if not exists profile_visibility text not null default 'public';

alter table public.profiles
  add constraint profiles_profile_visibility_check
  check (profile_visibility in ('public', 'members', 'interested_users', 'trade_partners', 'private'));

alter table public.market_seller_profiles
  add constraint market_seller_profiles_profile_visibility_check
  check (profile_visibility in ('public', 'members', 'interested_users', 'trade_partners', 'private'));

alter table public.public_member_profiles
  add constraint public_member_profiles_profile_visibility_check
  check (profile_visibility in ('public', 'members', 'interested_users', 'trade_partners', 'private'));

alter table public.public_member_profiles enable row level security;
revoke all on table public.public_member_profiles from public, anon, authenticated;
grant select on table public.public_member_profiles to anon, authenticated;

create or replace function private.sync_public_member_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.public_member_profiles (id, display_name, avatar_path, region_city, region_suburb, profile_visibility, updated_at)
  values (new.id, coalesce(new.display_name, 'Tada member'), new.avatar_path, new.region_city, new.region_suburb, new.profile_visibility, now())
  on conflict (id) do update set display_name = excluded.display_name, avatar_path = excluded.avatar_path, region_city = excluded.region_city, region_suburb = excluded.region_suburb, profile_visibility = excluded.profile_visibility, updated_at = now();
  return new;
end;
$$;
revoke all on function private.sync_public_member_profile() from public;
drop trigger if exists profiles_sync_public_member_profile on public.profiles;
create trigger profiles_sync_public_member_profile after insert or update of display_name, avatar_path, region_city, region_suburb, profile_visibility on public.profiles for each row execute function private.sync_public_member_profile();

drop policy if exists "Public member identity is readable" on public.public_member_profiles;
create policy "Public member identity is readable" on public.public_member_profiles for select to anon, authenticated using (true);

alter table public.profiles enable row level security;
drop policy if exists "Public profiles are readable" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
revoke select on table public.profiles from public, anon;
grant select on table public.profiles to authenticated;
create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);

update public.market_seller_profiles seller
set profile_visibility = profile.profile_visibility
from public.profiles profile
where seller.id = profile.id;

update public.public_member_profiles public_profile
set profile_visibility = profile.profile_visibility,
    updated_at = now()
from public.profiles profile
where public_profile.id = profile.id;

drop policy if exists "Published seller profiles are readable" on public.market_seller_profiles;
create policy "Published seller profiles respect visibility"
on public.market_seller_profiles for select to anon, authenticated
using (
  exists (select 1 from public.market_listings listing where listing.owner_id = market_seller_profiles.id and listing.status = 'published')
  and (
    profile_visibility = 'public'
    or (profile_visibility = 'members' and (select auth.uid()) is not null)
    or market_seller_profiles.id = (select auth.uid())
    or (profile_visibility = 'interested_users' and (
      exists (select 1 from public.market_wishlist wishlist join public.market_listings listing on listing.id = wishlist.listing_id where wishlist.user_id = (select auth.uid()) and listing.owner_id = market_seller_profiles.id and listing.status = 'published')
      or exists (select 1 from public.market_conversations conversation where ((conversation.buyer_id = (select auth.uid()) and conversation.seller_id = market_seller_profiles.id) or (conversation.seller_id = (select auth.uid()) and conversation.buyer_id = market_seller_profiles.id)))
    ))
    or (profile_visibility = 'trade_partners' and (
      exists (select 1 from public.market_trade_offers offer where offer.seller_id = market_seller_profiles.id and offer.buyer_id = (select auth.uid()) and offer.status = 'accepted')
      or exists (select 1 from public.market_trade_offers offer where offer.buyer_id = market_seller_profiles.id and offer.seller_id = (select auth.uid()) and offer.status = 'accepted')
      or exists (select 1 from public.bargain_item_reservations reservation where reservation.seller_id = market_seller_profiles.id and reservation.buyer_id = (select auth.uid()) and reservation.status in ('confirmed', 'on_the_way'))
      or exists (select 1 from public.bargain_item_reservations reservation where reservation.buyer_id = market_seller_profiles.id and reservation.seller_id = (select auth.uid()) and reservation.status in ('confirmed', 'on_the_way'))
    ))
  )
);

drop policy if exists "Public member identity is readable" on public.public_member_profiles;
create policy "Public member identity is readable"
on public.public_member_profiles for select to anon, authenticated using (true);
