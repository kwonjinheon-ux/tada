create table if not exists public.service_reviews (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.service_listings(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (service_id, reviewer_id)
);

create index if not exists service_reviews_service_created_idx
  on public.service_reviews (service_id, created_at desc);

alter table public.service_reviews enable row level security;
revoke all on table public.service_reviews from anon, authenticated;
grant select on table public.service_reviews to anon, authenticated;
grant insert on table public.service_reviews to authenticated;

create policy "Service reviews are publicly readable"
on public.service_reviews for select to anon, authenticated
using (true);

create policy "Members can create their own service review"
on public.service_reviews for insert to authenticated
with check ((select auth.uid()) = reviewer_id);

create or replace function public.refresh_service_listing_review_summary()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.service_listings
  set rating = coalesce((select round(avg(rating)::numeric, 1) from public.service_reviews where service_id = new.service_id), 0),
      review_count = (select count(*) from public.service_reviews where service_id = new.service_id)
  where id = new.service_id;
  return new;
end;
$$;

drop trigger if exists refresh_service_listing_review_summary on public.service_reviews;
create trigger refresh_service_listing_review_summary
after insert on public.service_reviews
for each row execute function public.refresh_service_listing_review_summary();
