create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'market_listing_status') then
    create type public.market_listing_status as enum ('draft', 'published', 'pending', 'sold', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'market_trade_method') then
    create type public.market_trade_method as enum ('pickup_delivery', 'pickup', 'delivery');
  end if;

  if not exists (select 1 from pg_type where typname = 'market_item_condition') then
    create type public.market_item_condition as enum ('brand_new', 'like_new', 'good', 'fair');
  end if;
end $$;

create table public.market_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null check (char_length(trim(label)) between 2 and 80),
  sort_order integer not null default 0,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.market_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.market_categories(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null check (char_length(trim(label)) between 2 and 80),
  sort_order integer not null default 0,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);

create table public.market_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 4 and 120),
  description text not null check (char_length(trim(description)) between 20 and 5000),
  category_slug text references public.market_categories(slug) on update cascade,
  subcategory_slug text,
  trade_method public.market_trade_method not null default 'pickup_delivery',
  item_condition public.market_item_condition not null default 'brand_new',
  price_cents integer not null default 0 check (price_cents >= 0),
  region_city text check (region_city is null or char_length(trim(region_city)) between 2 and 80),
  region_suburb text check (region_suburb is null or char_length(trim(region_suburb)) between 2 and 80),
  meeting_place text,
  status public.market_listing_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.market_listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_bucket text not null default 'market-listing-images',
  storage_path text not null,
  original_name text,
  mime_type text check (mime_type is null or mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer check (size_bytes is null or size_bytes <= 5242880),
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index market_categories_sort_idx on public.market_categories (sort_order, label);
create index market_subcategories_category_idx on public.market_subcategories (category_id, sort_order, label);
create index market_listings_browse_idx on public.market_listings (status, category_slug, created_at desc);
create index market_listings_owner_idx on public.market_listings (owner_id, created_at desc);
create index market_listing_photos_listing_idx on public.market_listing_photos (listing_id, display_order);
create unique index market_listing_photos_one_primary_idx on public.market_listing_photos (listing_id) where is_primary;

alter table public.market_categories enable row level security;
alter table public.market_subcategories enable row level security;
alter table public.market_listings enable row level security;
alter table public.market_listing_photos enable row level security;

create policy "Market categories are readable" on public.market_categories
for select to anon, authenticated
using (true);

create policy "Market subcategories are readable" on public.market_subcategories
for select to anon, authenticated
using (true);

create policy "Published market listings are readable" on public.market_listings
for select to anon, authenticated
using (status = 'published' or owner_id = (select auth.uid()));

create policy "Users create own market listings" on public.market_listings
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "Users update own market listings" on public.market_listings
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Users delete own market listings" on public.market_listings
for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "Published market listing photos are readable" on public.market_listing_photos
for select to anon, authenticated
using (
  exists (
    select 1
    from public.market_listings
    where market_listings.id = market_listing_photos.listing_id
      and (market_listings.status = 'published' or market_listings.owner_id = (select auth.uid()))
  )
);

create policy "Users create own market listing photos" on public.market_listing_photos
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.market_listings
    where market_listings.id = market_listing_photos.listing_id
      and market_listings.owner_id = (select auth.uid())
  )
);

create policy "Users update own market listing photos" on public.market_listing_photos
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Users delete own market listing photos" on public.market_listing_photos
for delete to authenticated
using (owner_id = (select auth.uid()));

create or replace function public.touch_market_listings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger market_listings_touch_updated_at
before update on public.market_listings
for each row
execute function public.touch_market_listings_updated_at();

insert into storage.buckets (id, name, public) values ('market-listing-images', 'market-listing-images', false)
on conflict (id) do nothing;

create policy "Users upload own market listing images" on storage.objects for insert to authenticated
with check (bucket_id = 'market-listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update own market listing images" on storage.objects for update to authenticated
using (bucket_id = 'market-listing-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'market-listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own market listing images" on storage.objects for delete to authenticated
using (bucket_id = 'market-listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Published market listing images are readable" on storage.objects for select to anon, authenticated
using (
  bucket_id = 'market-listing-images'
  and exists (
    select 1
    from public.market_listing_photos
    join public.market_listings on market_listings.id = market_listing_photos.listing_id
    where market_listing_photos.storage_bucket = storage.objects.bucket_id
      and market_listing_photos.storage_path = storage.objects.name
      and (market_listings.status = 'published' or market_listings.owner_id = (select auth.uid()))
  )
);

with category_seed(slug, label, sort_order, keywords) as (
  values
    ('electronics', 'Electronics', 10, array['phone','iphone','samsung','laptop','computer','tablet','camera','headphones','tv','console']),
    ('home-garden', 'Home & Garden', 20, array['sofa','table','chair','bed','fridge','washing','garden','tools','furniture']),
    ('clothing-fashion', 'Clothing & Fashion', 30, array['clothes','dress','jacket','shoes','sneakers','watch','bag','fashion']),
    ('baby-kids', 'Baby & Kids', 40, array['baby','kids','stroller','pram','cot','car seat','toys']),
    ('sports-outdoors', 'Sports & Outdoors', 50, array['bike','gym','camping','fishing','golf','surf','sports']),
    ('toys-games-hobbies', 'Toys, Games & Hobbies', 60, array['toy','lego','board game','puzzle','model','craft','hobby']),
    ('books-movies-music', 'Books, Movies & Music', 70, array['book','dvd','vinyl','record','cd','movie','music']),
    ('health-beauty', 'Health & Beauty', 80, array['beauty','makeup','skincare','perfume','health']),
    ('antiques-collectables', 'Antiques & Collectables', 90, array['antique','vintage','collectable','coin','stamp','memorabilia']),
    ('business-farming-industry', 'Business, Farming & Industry', 100, array['business','office','farming','tractor','industrial','equipment']),
    ('pets-animals', 'Pets & Animals', 110, array['pet','dog','cat','fish','bird','animal']),
    ('vehicles', 'Vehicles', 120, array['car','vehicle','van','ute','motorbike','boat','trailer','parts']),
    ('free-stuff', 'Free Stuff', 130, array['free','giveaway','pickup free'])
)
insert into public.market_categories (slug, label, sort_order, keywords)
select slug, label, sort_order, keywords from category_seed
on conflict (slug) do update set label = excluded.label, sort_order = excluded.sort_order, keywords = excluded.keywords;

with subcategory_seed(category_slug, slug, label, sort_order, keywords) as (
  values
    ('electronics','mobile-phones','Mobile phones',10,array['phone','iphone','samsung','pixel','mobile']),
    ('electronics','computers','Computers',20,array['computer','pc','desktop','monitor','keyboard','mouse']),
    ('electronics','laptops','Laptops',30,array['laptop','macbook','notebook']),
    ('electronics','tablets','Tablets',40,array['tablet','ipad','galaxy tab']),
    ('electronics','audio','Audio',50,array['headphones','earbuds','speaker','audio','soundbar']),
    ('electronics','cameras','Cameras',60,array['camera','canon','nikon','sony','lens','gopro']),
    ('electronics','tv-home-theatre','TV & home theatre',70,array['tv','television','projector','home theatre']),
    ('electronics','gaming','Gaming',80,array['playstation','xbox','nintendo','console','gaming']),
    ('home-garden','furniture','Furniture',10,array['sofa','couch','table','chair','desk','dresser','cabinet']),
    ('home-garden','beds-mattresses','Beds & mattresses',20,array['bed','mattress','queen','king','bunk']),
    ('home-garden','appliances','Appliances',30,array['fridge','freezer','washing','dryer','dishwasher','microwave']),
    ('home-garden','kitchenware','Kitchenware',40,array['kitchen','pan','pot','plates','cutlery']),
    ('home-garden','garden-outdoor','Garden & outdoor',50,array['garden','outdoor','lawn','mower','plants','bbq']),
    ('home-garden','tools-diy','Tools & DIY',60,array['tool','drill','saw','ladder','diy']),
    ('home-garden','home-decor','Home decor',70,array['decor','rug','lamp','curtain','mirror','art']),
    ('clothing-fashion','women','Women',10,array['women','dress','skirt','heels','blouse']),
    ('clothing-fashion','men','Men',20,array['men','shirt','suit','jacket','jeans']),
    ('clothing-fashion','shoes','Shoes',30,array['shoes','sneakers','boots','heels','nike','adidas']),
    ('clothing-fashion','bags-luggage','Bags & luggage',40,array['bag','handbag','backpack','luggage','suitcase']),
    ('clothing-fashion','jewellery-watches','Jewellery & watches',50,array['jewellery','ring','necklace','watch','bracelet']),
    ('baby-kids','prams-strollers','Prams & strollers',10,array['pram','stroller','buggy']),
    ('baby-kids','car-seats','Car seats',20,array['car seat','booster']),
    ('baby-kids','cots-nursery','Cots & nursery',30,array['cot','bassinet','nursery']),
    ('baby-kids','kids-toys','Toys',40,array['toy','lego','doll','kids toys']),
    ('sports-outdoors','bikes','Bikes',10,array['bike','bicycle','mountain bike','road bike']),
    ('sports-outdoors','fitness-gym','Fitness & gym',20,array['gym','fitness','weights','treadmill']),
    ('sports-outdoors','camping-hiking','Camping & hiking',30,array['camping','tent','hiking','backpack']),
    ('sports-outdoors','fishing','Fishing',40,array['fishing','rod','reel']),
    ('sports-outdoors','water-sports','Water sports',50,array['surf','kayak','paddleboard','wetsuit']),
    ('toys-games-hobbies','toys','Toys',10,array['toy','doll','lego','blocks']),
    ('toys-games-hobbies','board-games-puzzles','Board games & puzzles',20,array['board game','puzzle','cards']),
    ('toys-games-hobbies','musical-instruments','Musical instruments',50,array['guitar','piano','keyboard','drums','instrument']),
    ('books-movies-music','books','Books',10,array['book','novel','textbook']),
    ('books-movies-music','movies','Movies',20,array['dvd','blu-ray','movie']),
    ('books-movies-music','music','Music',30,array['cd','vinyl','record','album']),
    ('health-beauty','makeup','Makeup',10,array['makeup','lipstick','foundation']),
    ('health-beauty','skincare','Skincare',20,array['skincare','cream','serum']),
    ('health-beauty','hair-care','Hair care',30,array['hair','dryer','straightener']),
    ('antiques-collectables','antiques','Antiques',10,array['antique','old','vintage']),
    ('antiques-collectables','collectables','Collectables',20,array['collectable','memorabilia']),
    ('business-farming-industry','office-equipment','Office equipment',10,array['office','printer','desk','chair']),
    ('business-farming-industry','farming-equipment','Farming equipment',20,array['farm','tractor','livestock','farming']),
    ('pets-animals','dogs','Dogs',10,array['dog','puppy','kennel']),
    ('pets-animals','cats','Cats',20,array['cat','kitten']),
    ('pets-animals','pet-supplies','Pet supplies',50,array['pet','crate','leash','food']),
    ('vehicles','cars','Cars',10,array['car','toyota','honda','mazda','bmw']),
    ('vehicles','motorbikes','Motorbikes',20,array['motorbike','motorcycle','scooter']),
    ('vehicles','boats','Boats',30,array['boat','jetski','marine']),
    ('vehicles','vehicle-parts-accessories','Parts & accessories',50,array['tyre','wheel','parts','accessory']),
    ('free-stuff','free-household-items','Free household items',10,array['free','household']),
    ('free-stuff','free-furniture','Free furniture',20,array['free sofa','free table','free furniture'])
)
insert into public.market_subcategories (category_id, slug, label, sort_order, keywords)
select market_categories.id, subcategory_seed.slug, subcategory_seed.label, subcategory_seed.sort_order, subcategory_seed.keywords
from subcategory_seed
join public.market_categories on market_categories.slug = subcategory_seed.category_slug
on conflict (category_id, slug) do update set label = excluded.label, sort_order = excluded.sort_order, keywords = excluded.keywords;
