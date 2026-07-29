-- Reports are global operations data: marketplace today, community and other products later.
alter table public.market_reports
  add column domain text not null default 'market'
  check (domain in ('market', 'community', 'jobs', 'platform'));

create index market_reports_domain_target_idx
  on public.market_reports (domain, target_type, target_id, created_at desc);

create policy "Moderators can read all member profiles"
on public.profiles for select to authenticated
using ((select public.market_is_moderator()));
