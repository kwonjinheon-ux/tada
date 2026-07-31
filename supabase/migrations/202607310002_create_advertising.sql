create type public.ad_provider as enum ('adsense', 'sponsor');
create type public.ad_placement as enum ('market_top', 'market_feed', 'market_sidebar', 'search_feed', 'product_detail_middle', 'product_detail_bottom');
create type public.ad_serving_mode as enum ('sponsor_first', 'adsense_first', 'weighted_mix', 'sponsor_only', 'adsense_only');
create type public.ad_event_type as enum ('impression', 'click');
create type public.ad_device_type as enum ('desktop', 'mobile');

create table public.ads (
  id uuid primary key default gen_random_uuid(), provider public.ad_provider not null, name text not null check (char_length(trim(name)) between 2 and 120), sponsor_name text, campaign_name text,
  placement public.ad_placement not null, priority integer not null default 0 check (priority between 0 and 9999), frequency_level smallint not null default 1 check (frequency_level between 1 and 5), weight integer not null default 1 check (weight > 0),
  adsense_client_id text, adsense_slot_id text, adsense_format text, desktop_image_url text, mobile_image_url text, destination_url text, alt_text text,
  show_on_desktop boolean not null default true, show_on_mobile boolean not null default false, allow_responsive_fallback boolean not null default false, open_in_new_tab boolean not null default true,
  daily_impression_cap integer check (daily_impression_cap is null or daily_impression_cap > 0), total_impression_cap integer check (total_impression_cap is null or total_impression_cap > 0),
  starts_at timestamptz, ends_at timestamptz, is_active boolean not null default false, admin_notes text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at),
  check ((provider = 'adsense' and adsense_client_id is not null and adsense_slot_id is not null) or (provider = 'sponsor' and sponsor_name is not null and desktop_image_url is not null and destination_url is not null and alt_text is not null))
);
create table public.ad_placement_settings (
  id uuid primary key default gen_random_uuid(), placement public.ad_placement not null unique, serving_mode public.ad_serving_mode not null default 'sponsor_first', sponsor_percentage smallint not null default 50 check (sponsor_percentage between 0 and 100), adsense_percentage smallint not null default 50 check (adsense_percentage between 0 and 100),
  desktop_feed_interval smallint not null default 12 check (desktop_feed_interval between 1 and 48), mobile_feed_interval smallint not null default 12 check (mobile_feed_interval between 1 and 48), is_enabled boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (serving_mode <> 'weighted_mix' or sponsor_percentage + adsense_percentage = 100)
);
create table public.ad_events (
  id uuid primary key default gen_random_uuid(), ad_id uuid not null references public.ads(id) on delete cascade, event_type public.ad_event_type not null, placement public.ad_placement not null, session_id text not null check (char_length(session_id) between 16 and 128), user_id uuid references auth.users(id), device_type public.ad_device_type not null, page_path text not null check (left(page_path, 1) = '/'), created_at timestamptz not null default now()
);
create index ads_active_placement_idx on public.ads (placement, is_active, priority desc);
create index ad_events_ad_id_idx on public.ad_events (ad_id); create index ad_events_created_at_idx on public.ad_events (created_at); create index ad_events_event_type_idx on public.ad_events (event_type); create index ad_events_placement_idx on public.ad_events (placement); create index ad_events_rollup_idx on public.ad_events (ad_id, event_type, created_at);
alter table public.ads enable row level security; alter table public.ad_placement_settings enable row level security; alter table public.ad_events enable row level security;
create policy "Moderators manage ads" on public.ads for all to authenticated using ((select public.market_is_moderator())) with check ((select public.market_is_moderator()));
create policy "Moderators manage ad settings" on public.ad_placement_settings for all to authenticated using ((select public.market_is_moderator())) with check ((select public.market_is_moderator()));
create policy "Moderators read ad events" on public.ad_events for select to authenticated using ((select public.market_is_moderator()));
create policy "Visitors record bounded ad events" on public.ad_events for insert to anon, authenticated with check (event_type in ('impression', 'click') and char_length(session_id) between 16 and 128 and left(page_path, 1) = '/');
create view public.active_ad_candidates as
select a.id, a.provider, a.name, a.sponsor_name, a.placement, a.priority, a.frequency_level, a.weight, a.adsense_client_id, a.adsense_slot_id, a.adsense_format, a.desktop_image_url, a.mobile_image_url, a.destination_url, a.alt_text, a.show_on_desktop, a.show_on_mobile, a.allow_responsive_fallback, a.open_in_new_tab, a.daily_impression_cap, a.total_impression_cap,
  count(e.id) filter (where e.event_type = 'impression' and e.created_at >= date_trunc('day', now())) as daily_impressions,
  count(e.id) filter (where e.event_type = 'impression') as total_impressions
from public.ads a left join public.ad_events e on e.ad_id = a.id
where a.is_active and (a.starts_at is null or a.starts_at <= now()) and (a.ends_at is null or a.ends_at >= now())
group by a.id;
create view public.public_ad_placement_settings as select placement, serving_mode, sponsor_percentage, adsense_percentage, desktop_feed_interval, mobile_feed_interval, is_enabled from public.ad_placement_settings where is_enabled;
grant select on public.active_ad_candidates, public.public_ad_placement_settings to anon, authenticated;
insert into public.ad_placement_settings (placement) select unnest(enum_range(null::public.ad_placement)) on conflict (placement) do nothing;
