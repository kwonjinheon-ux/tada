-- Keep existing single-keyword alerts in sync with the expanded bilingual
-- category dictionary. Only update unclassified, unambiguous terms; users'
-- manually or previously assigned categories remain untouched.
update public.market_keyword_alerts
set category_slug = case normalized_keyword
  when '아이폰' then 'mobile-phones-tablets'
  when '스마트폰' then 'mobile-phones-tablets'
  when '테이블' then 'furniture-home-decor'
end
where category_slug is null
  and normalized_keyword in ('아이폰', '스마트폰', '테이블');
