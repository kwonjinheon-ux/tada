create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 40),
  nickname_changed_at timestamptz,
  phone text,
  location_mode text not null default 'manual' check (location_mode in ('manual', 'current')),
  region_city text,
  region_suburb text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.enforce_profile_rules() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.nickname_changed_at := coalesce(new.nickname_changed_at, now());
  elsif new.display_name is distinct from old.display_name then
    if old.nickname_changed_at is not null and old.nickname_changed_at > now() - interval '30 days' then
      raise exception 'Nickname can only be changed once every 30 days.';
    end if;
    new.nickname_changed_at := now();
  else
    new.nickname_changed_at := old.nickname_changed_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_enforce_rules before insert or update on public.profiles for each row execute function public.enforce_profile_rules();
