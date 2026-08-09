-- Fixed-price Bargain deal tiers are product rules, not just UI affordances.
-- Align any existing tier listings before replacing the previous maximum-price rule.
update public.bargain_listings
set price_cents = case bargain_type
  when '2-dollar-deals' then 200
  when '5-dollar-deals' then 500
  when '10-dollar-deals' then 1000
  else price_cents
end
where bargain_type in ('2-dollar-deals', '5-dollar-deals', '10-dollar-deals')
  and price_cents <> case bargain_type
    when '2-dollar-deals' then 200
    when '5-dollar-deals' then 500
    when '10-dollar-deals' then 1000
    else price_cents
  end;

alter table public.bargain_listings
  drop constraint if exists bargain_listings_price_tier_check;

alter table public.bargain_listings
  add constraint bargain_listings_price_tier_check check (
    (bargain_type = '2-dollar-deals' and price_cents = 200)
    or (bargain_type = '5-dollar-deals' and price_cents = 500)
    or (bargain_type = '10-dollar-deals' and price_cents = 1000)
    or bargain_type in ('moving-sale', 'garage-sale')
  );
