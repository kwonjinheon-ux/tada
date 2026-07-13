create or replace function public.enforce_profile_rules() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.nickname_changed_at := old.nickname_changed_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
