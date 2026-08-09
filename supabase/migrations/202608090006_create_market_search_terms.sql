create table if not exists public.market_search_terms (
  term text primary key check (char_length(term) between 2 and 80),
  search_count bigint not null default 0 check (search_count >= 0),
  last_searched_at timestamptz not null default now()
);

alter table public.market_search_terms enable row level security;

grant select on table public.market_search_terms to anon, authenticated;
grant select, insert, update, delete on table public.market_search_terms to service_role;

drop policy if exists "Market search terms are readable" on public.market_search_terms;
create policy "Market search terms are readable"
  on public.market_search_terms
  for select
  to anon, authenticated
  using (true);

create index if not exists market_search_terms_popularity_idx
  on public.market_search_terms (search_count desc, last_searched_at desc);
