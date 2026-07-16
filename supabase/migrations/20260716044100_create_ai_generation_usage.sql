create table public.ai_generation_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null check (feature in ('listing_description')),
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('started', 'success', 'failed')),
  model text not null check (char_length(model) between 1 and 120),
  created_at timestamptz not null default now()
);

create index ai_generation_usage_user_feature_created_idx
on public.ai_generation_usage (user_id, feature, created_at desc);

alter table public.ai_generation_usage enable row level security;

create policy "Users read own AI generation usage" on public.ai_generation_usage
for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users create own AI generation usage" on public.ai_generation_usage
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users update own AI generation usage" on public.ai_generation_usage
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users read own market listing images" on storage.objects
for select to authenticated
using (
  bucket_id = 'market-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
