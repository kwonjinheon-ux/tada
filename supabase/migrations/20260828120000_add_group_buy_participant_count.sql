alter table public.group_buys
  add column participant_count integer not null default 0
  check (participant_count >= 0);

update public.group_buys
set participant_count = counts.order_count
from (
  select group_buy_id, count(*)::integer as order_count
  from public.group_buy_orders
  group by group_buy_id
) as counts
where public.group_buys.id = counts.group_buy_id;

create or replace function private.sync_group_buy_participant_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group_buy_id uuid := coalesce(new.group_buy_id, old.group_buy_id);
begin
  update public.group_buys
  set participant_count = (
    select count(*)::integer
    from public.group_buy_orders
    where group_buy_id = target_group_buy_id
  )
  where id = target_group_buy_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists group_buy_orders_sync_participant_count on public.group_buy_orders;
create trigger group_buy_orders_sync_participant_count
after insert or delete on public.group_buy_orders
for each row execute function private.sync_group_buy_participant_count();
