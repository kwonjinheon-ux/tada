create or replace function public.enforce_profile_rules() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.nickname_changed_at := coalesce(new.nickname_changed_at, now());
    new.updated_at := now();
  elsif new.display_name is distinct from old.display_name then
    if old.nickname_changed_at is not null and old.nickname_changed_at > now() - interval '30 days' then
      raise exception 'Nickname can only be changed once every 30 days.';
    end if;
    new.nickname_changed_at := now();
    new.updated_at := now();
  else
    new.nickname_changed_at := old.nickname_changed_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
