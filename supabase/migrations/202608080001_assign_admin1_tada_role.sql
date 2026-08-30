-- Grant the existing Auth user for this operational account full admin access.
-- The account must already have completed sign-up so it has a matching profile.
insert into public.user_roles (user_id, role)
select profiles.id, 'admin'
from auth.users
join public.profiles on profiles.id = auth.users.id
where lower(auth.users.email) = 'admin1tada@gmail.com'
on conflict (user_id) do update
set
  role = excluded.role,
  updated_at = now();
