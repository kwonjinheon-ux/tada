-- Apply with the Supabase CLI after reviewing MD/security/supabase-rls.md.
create extension if not exists "pgcrypto";

create type public.listing_status as enum ('draft', 'available', 'pending', 'sold', 'archived');
create type public.listing_condition as enum ('brand_new', 'like_new', 'good', 'fair');
create type public.trade_method as enum ('pickup_delivery', 'pickup', 'delivery');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 2 and 80),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 120),
  description text not null check (char_length(description) between 20 and 5000),
  main_category text not null,
  sub_category text not null,
  trade_method public.trade_method not null,
  item_condition public.listing_condition not null,
  price_cents integer not null check (price_cents > 0),
  region text not null,
  area text not null,
  meeting_place text not null,
  status public.listing_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_browse_idx on public.listings (status, main_category, created_at desc);
create index listings_owner_idx on public.listings (owner_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;

create policy "Public profiles are readable" on public.profiles for select using (true);
create policy "Users create their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update their profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Published listings are readable" on public.listings for select using (status = 'available' or owner_id = auth.uid());
create policy "Users create own listings" on public.listings for insert with check (owner_id = auth.uid());
create policy "Users update own listings" on public.listings for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Users delete own listings" on public.listings for delete using (owner_id = auth.uid());

-- Storage bucket must be private. Access it through signed URLs and an owner-bound policy.
insert into storage.buckets (id, name, public) values ('listing-images', 'listing-images', false)
on conflict (id) do nothing;

create policy "Users upload only to their directory" on storage.objects for insert to authenticated
with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users read their own images" on storage.objects for select to authenticated
using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users remove their own images" on storage.objects for delete to authenticated
using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
