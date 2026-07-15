create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := left(
    trim(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        nullif(split_part(new.email, '@', 1), ''),
        'Tada member'
      )
    ),
    40
  );

  if char_length(profile_name) < 2 then
    profile_name := 'Tada member';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, profile_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public;

drop trigger if exists auth_user_creates_profile on auth.users;
create trigger auth_user_creates_profile
after insert on auth.users
for each row
execute function public.create_profile_for_new_user();

insert into public.profiles (id, display_name)
select
  users.id,
  case
    when char_length(candidate.profile_name) >= 2 then candidate.profile_name
    else 'Tada member'
  end
from auth.users as users
cross join lateral (
  select left(
    trim(
      coalesce(
        nullif(users.raw_user_meta_data ->> 'full_name', ''),
        nullif(split_part(users.email, '@', 1), ''),
        'Tada member'
      )
    ),
    40
  ) as profile_name
) as candidate
on conflict (id) do nothing;
