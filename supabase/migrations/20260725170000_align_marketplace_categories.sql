-- Canonical category slugs are language-neutral. English labels are the default UI locale.
-- Existing listings are retained and mapped before legacy categories are removed.
with category_seed(slug, label, sort_order, keywords) as (
  values
    ('mobile-phones-tablets', 'Mobile Phones & Tablets', 10, array['phone','iphone','samsung','tablet','휴대폰','태블릿']),
    ('computers-laptops', 'Computers & Laptops', 20, array['computer','laptop','macbook','pc','컴퓨터','노트북']),
    ('electronics-appliances', 'Electronics & Appliances', 30, array['tv','camera','speaker','fridge','washing machine','가전']),
    ('furniture-home-decor', 'Furniture & Home Decor', 40, array['sofa','bed','table','chair','furniture','가구']),
    ('home-kitchen', 'Home & Kitchen', 50, array['cookware','kitchen','bedding','towel','주방']),
    ('clothing-fashion', 'Clothing & Fashion', 60, array['clothing','dress','shoes','bag','fashion','의류']),
    ('baby-kids', 'Baby & Kids', 70, array['baby','stroller','car seat','kids','유아']),
    ('books-music-media', 'Books, Music & Media', 80, array['book','vinyl','dvd','cd','책']),
    ('hobbies-collectables', 'Hobbies & Collectables', 90, array['collectable','antique','craft','figure','취미']),
    ('games-toys', 'Games & Toys', 100, array['game','console','lego','toy','게임','장난감']),
    ('sports-leisure', 'Sports & Leisure', 110, array['sports','bike','camping','golf','fitness','스포츠']),
    ('musical-instruments', 'Musical Instruments', 120, array['guitar','piano','drum','microphone','악기']),
    ('garden-tools-diy', 'Garden, Tools & DIY', 130, array['tool','drill','garden','plant','diy','공구']),
    ('pet-supplies', 'Pet Supplies', 140, array['pet','dog','cat','aquarium','반려동물']),
    ('health-beauty', 'Health & Beauty', 150, array['skincare','makeup','perfume','health','beauty','화장품'])
)
insert into public.market_categories (slug, label, sort_order, keywords)
select slug, label, sort_order, keywords from category_seed
on conflict (slug) do update set label = excluded.label, sort_order = excluded.sort_order, keywords = excluded.keywords;

update public.market_listings
set category_slug = case
  when category_slug = 'electronics' and subcategory_slug in ('mobile-phones', 'tablets') then 'mobile-phones-tablets'
  when category_slug = 'electronics' and subcategory_slug in ('computers', 'laptops') then 'computers-laptops'
  when category_slug = 'electronics' then 'electronics-appliances'
  when category_slug = 'home-garden' and subcategory_slug in ('furniture', 'beds-mattresses', 'home-decor') then 'furniture-home-decor'
  when category_slug = 'home-garden' and subcategory_slug = 'kitchenware' then 'home-kitchen'
  when category_slug = 'home-garden' then 'garden-tools-diy'
  when category_slug = 'sports-outdoors' then 'sports-leisure'
  when category_slug = 'toys-games-hobbies' and subcategory_slug = 'musical-instruments' then 'musical-instruments'
  when category_slug = 'toys-games-hobbies' and subcategory_slug in ('toys', 'board-games-puzzles') then 'games-toys'
  when category_slug = 'toys-games-hobbies' then 'hobbies-collectables'
  when category_slug = 'books-movies-music' then 'books-music-media'
  when category_slug = 'antiques-collectables' then 'hobbies-collectables'
  when category_slug = 'pets-animals' then 'pet-supplies'
  when category_slug = 'business-farming-industry' then 'garden-tools-diy'
  when category_slug in ('vehicles', 'free-stuff') then null
  else category_slug
end,
subcategory_slug = null
where category_slug in ('electronics', 'home-garden', 'sports-outdoors', 'toys-games-hobbies', 'books-movies-music', 'antiques-collectables', 'pets-animals', 'business-farming-industry', 'vehicles', 'free-stuff');

update public.market_keyword_alerts
set category_slug = case category_slug
  when 'electronics' then 'electronics-appliances'
  when 'home-garden' then 'garden-tools-diy'
  when 'sports-outdoors' then 'sports-leisure'
  when 'toys-games-hobbies' then 'games-toys'
  when 'books-movies-music' then 'books-music-media'
  when 'antiques-collectables' then 'hobbies-collectables'
  when 'pets-animals' then 'pet-supplies'
  when 'business-farming-industry' then 'garden-tools-diy'
  when 'vehicles' then null
  when 'free-stuff' then null
  else category_slug
end
where category_slug in ('electronics', 'home-garden', 'sports-outdoors', 'toys-games-hobbies', 'books-movies-music', 'antiques-collectables', 'pets-animals', 'business-farming-industry', 'vehicles', 'free-stuff');

delete from public.market_categories
where slug in ('electronics', 'home-garden', 'sports-outdoors', 'toys-games-hobbies', 'books-movies-music', 'antiques-collectables', 'pets-animals', 'business-farming-industry', 'vehicles', 'free-stuff');
