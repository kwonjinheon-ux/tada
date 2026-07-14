create table public.listing_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null check (char_length(trim(label)) between 2 and 80),
  source text not null default 'curated',
  sort_order integer not null default 0,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.listing_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.listing_categories(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null check (char_length(trim(label)) between 2 and 80),
  source text not null default 'curated',
  sort_order integer not null default 0,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);

create table public.content_post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.content_posts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null default 'listing-images',
  storage_path text not null,
  original_name text,
  mime_type text check (mime_type is null or mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer check (size_bytes is null or size_bytes <= 5242880),
  width integer,
  height integer,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index listing_subcategories_category_idx on public.listing_subcategories (category_id, sort_order, label);
create index content_post_photos_post_idx on public.content_post_photos (post_id, display_order);
create unique index content_post_photos_one_primary_idx on public.content_post_photos (post_id) where is_primary;

alter table public.listing_categories enable row level security;
alter table public.listing_subcategories enable row level security;
alter table public.content_post_photos enable row level security;

create policy "Listing categories are readable" on public.listing_categories
for select
to anon, authenticated
using (true);

create policy "Listing subcategories are readable" on public.listing_subcategories
for select
to anon, authenticated
using (true);

create policy "Published content post photos are readable" on public.content_post_photos
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.content_posts
    where content_posts.id = content_post_photos.post_id
      and (content_posts.status = 'published' or content_posts.author_id = (select auth.uid()))
  )
);

create policy "Users create own content post photos" on public.content_post_photos
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.content_posts
    where content_posts.id = content_post_photos.post_id
      and content_posts.author_id = (select auth.uid())
  )
);

create policy "Users update own content post photos" on public.content_post_photos
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Users delete own content post photos" on public.content_post_photos
for delete
to authenticated
using (owner_id = (select auth.uid()));

insert into storage.buckets (id, name, public) values ('listing-images', 'listing-images', false)
on conflict (id) do nothing;

create policy "Users replace their own listing images" on storage.objects for update to authenticated
using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

with category_seed(slug, label, source, sort_order, keywords) as (
  values
    ('electronics', 'Electronics', 'trade_me_facebook_curated', 10, array['phone','iphone','samsung','laptop','computer','tablet','camera','headphones','tv','console']),
    ('home-garden', 'Home & Garden', 'trade_me_facebook_curated', 20, array['sofa','table','chair','bed','fridge','washing','garden','tools','furniture']),
    ('clothing-fashion', 'Clothing & Fashion', 'trade_me_facebook_curated', 30, array['clothes','dress','jacket','shoes','sneakers','watch','bag','fashion']),
    ('baby-kids', 'Baby & Kids', 'trade_me_facebook_curated', 40, array['baby','kids','stroller','pram','cot','car seat','toys']),
    ('sports-outdoors', 'Sports & Outdoors', 'trade_me_facebook_curated', 50, array['bike','gym','camping','fishing','golf','surf','sports']),
    ('toys-games-hobbies', 'Toys, Games & Hobbies', 'trade_me_facebook_curated', 60, array['toy','lego','board game','puzzle','model','craft','hobby']),
    ('books-movies-music', 'Books, Movies & Music', 'trade_me_facebook_curated', 70, array['book','dvd','vinyl','record','cd','movie','music']),
    ('health-beauty', 'Health & Beauty', 'trade_me_facebook_curated', 80, array['beauty','makeup','skincare','perfume','health']),
    ('antiques-collectables', 'Antiques & Collectables', 'trade_me_facebook_curated', 90, array['antique','vintage','collectable','coin','stamp','memorabilia']),
    ('business-farming-industry', 'Business, Farming & Industry', 'trade_me_facebook_curated', 100, array['business','office','farming','tractor','industrial','equipment']),
    ('pets-animals', 'Pets & Animals', 'trade_me_facebook_curated', 110, array['pet','dog','cat','fish','bird','animal']),
    ('vehicles', 'Vehicles', 'trade_me_facebook_curated', 120, array['car','vehicle','van','ute','motorbike','boat','trailer','parts']),
    ('free-stuff', 'Free Stuff', 'trade_me_facebook_curated', 130, array['free','giveaway','pickup free'])
)
insert into public.listing_categories (slug, label, source, sort_order, keywords)
select slug, label, source, sort_order, keywords from category_seed
on conflict (slug) do update set
  label = excluded.label,
  source = excluded.source,
  sort_order = excluded.sort_order,
  keywords = excluded.keywords;

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
    ('clothing-fashion','kids-clothing','Kids clothing',60,array['kids','baby clothes','children']),
    ('baby-kids','prams-strollers','Prams & strollers',10,array['pram','stroller','buggy']),
    ('baby-kids','car-seats','Car seats',20,array['car seat','booster']),
    ('baby-kids','cots-nursery','Cots & nursery',30,array['cot','bassinet','nursery']),
    ('baby-kids','kids-toys','Toys',40,array['toy','lego','doll','kids toys']),
    ('baby-kids','baby-clothing','Baby clothing',50,array['baby clothes','onesie','infant']),
    ('sports-outdoors','bikes','Bikes',10,array['bike','bicycle','mountain bike','road bike']),
    ('sports-outdoors','fitness-gym','Fitness & gym',20,array['gym','fitness','weights','treadmill']),
    ('sports-outdoors','camping-hiking','Camping & hiking',30,array['camping','tent','hiking','backpack']),
    ('sports-outdoors','fishing','Fishing',40,array['fishing','rod','reel']),
    ('sports-outdoors','water-sports','Water sports',50,array['surf','kayak','paddleboard','wetsuit']),
    ('sports-outdoors','team-sports','Team sports',60,array['rugby','football','soccer','basketball']),
    ('toys-games-hobbies','toys','Toys',10,array['toy','doll','lego','blocks']),
    ('toys-games-hobbies','board-games-puzzles','Board games & puzzles',20,array['board game','puzzle','cards']),
    ('toys-games-hobbies','models','Models',30,array['model','rc','remote control']),
    ('toys-games-hobbies','crafts','Crafts',40,array['craft','sewing','knitting','fabric']),
    ('toys-games-hobbies','musical-instruments','Musical instruments',50,array['guitar','piano','keyboard','drums','instrument']),
    ('books-movies-music','books','Books',10,array['book','novel','textbook']),
    ('books-movies-music','movies','Movies',20,array['dvd','blu-ray','movie']),
    ('books-movies-music','music','Music',30,array['cd','vinyl','record','album']),
    ('books-movies-music','magazines','Magazines',40,array['magazine','comic']),
    ('health-beauty','makeup','Makeup',10,array['makeup','lipstick','foundation']),
    ('health-beauty','skincare','Skincare',20,array['skincare','cream','serum']),
    ('health-beauty','hair-care','Hair care',30,array['hair','dryer','straightener']),
    ('health-beauty','fragrance','Fragrance',40,array['perfume','cologne','fragrance']),
    ('health-beauty','health-equipment','Health equipment',50,array['health','mobility','wheelchair','walker']),
    ('antiques-collectables','antiques','Antiques',10,array['antique','old','vintage']),
    ('antiques-collectables','collectables','Collectables',20,array['collectable','memorabilia']),
    ('antiques-collectables','coins','Coins',30,array['coin','currency']),
    ('antiques-collectables','stamps','Stamps',40,array['stamp']),
    ('antiques-collectables','art','Art',50,array['art','painting','print']),
    ('business-farming-industry','office-equipment','Office equipment',10,array['office','printer','desk','chair']),
    ('business-farming-industry','farming-equipment','Farming equipment',20,array['farm','tractor','livestock','farming']),
    ('business-farming-industry','industrial-tools','Industrial tools',30,array['industrial','workshop','compressor']),
    ('business-farming-industry','commercial-kitchen','Commercial kitchen',40,array['commercial kitchen','cafe','restaurant']),
    ('pets-animals','dogs','Dogs',10,array['dog','puppy','kennel']),
    ('pets-animals','cats','Cats',20,array['cat','kitten']),
    ('pets-animals','fish','Fish',30,array['fish','aquarium','tank']),
    ('pets-animals','birds','Birds',40,array['bird','cage']),
    ('pets-animals','pet-supplies','Pet supplies',50,array['pet','crate','leash','food']),
    ('vehicles','cars','Cars',10,array['car','toyota','honda','mazda','bmw']),
    ('vehicles','motorbikes','Motorbikes',20,array['motorbike','motorcycle','scooter']),
    ('vehicles','boats','Boats',30,array['boat','jetski','marine']),
    ('vehicles','trailers','Trailers',40,array['trailer']),
    ('vehicles','vehicle-parts-accessories','Parts & accessories',50,array['tyre','wheel','parts','accessory']),
    ('free-stuff','free-household-items','Free household items',10,array['free','household']),
    ('free-stuff','free-furniture','Free furniture',20,array['free sofa','free table','free furniture']),
    ('free-stuff','free-garden-items','Free garden items',30,array['free garden','plants'])
)
insert into public.listing_subcategories (category_id, slug, label, source, sort_order, keywords)
select listing_categories.id, subcategory_seed.slug, subcategory_seed.label, 'trade_me_facebook_curated', subcategory_seed.sort_order, subcategory_seed.keywords
from subcategory_seed
join public.listing_categories on listing_categories.slug = subcategory_seed.category_slug
on conflict (category_id, slug) do update set
  label = excluded.label,
  source = excluded.source,
  sort_order = excluded.sort_order,
  keywords = excluded.keywords;
