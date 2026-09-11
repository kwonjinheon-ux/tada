-- One reusable database guard for every public user-generated content table.
-- Application checks improve UX; this trigger remains authoritative when a
-- client writes directly through Supabase or bypasses a form.
create or replace function public.reject_prohibited_public_content()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(new);
  content text;
begin
  content := lower(concat_ws(' ',
    row_data ->> 'title',
    row_data ->> 'body',
    row_data ->> 'description',
    row_data ->> 'provider_name',
    row_data ->> 'business_name',
    row_data ->> 'service_summary',
    row_data ->> 'category_slug',
    row_data ->> 'subcategory_slug',
    row_data ->> 'service_details',
    row_data ->> 'name',
    row_data ->> 'note',
    row_data ->> 'unit_label',
    row_data ->> 'comment'
  ));

  if content ~ '(firearm|gun|rifle|shotgun|handgun|pistol|ammunition|ammo|weapon|taser|총기|권총|소총|산탄총|탄약|무기|전기충격기|prescription[[:space:]]*(medicine|medication|drug)|rx[[:space:]]*(medicine|medication|drug)|antibiotic|opioid|처방약|처방전[[:space:]]*약|항생제|마약성[[:space:]]*진통제|tobacco|cigarette|cigar|vape|e-?cig|nicotine|담배|전자담배|액상|니코틴|alcohol|beer|wine|spirits?|liquor|whisky|whiskey|vodka|booze|grog|(^|[^가-힣])술([^가-힣]|$)|맥주|와인|위스키|보드카|주류|소주|막걸리|양주|recreational[[:space:]]+drug|cannabis|marijuana|weed|cocaine|mdma|ecstasy|meth(amphetamine)?|heroin|fentanyl|molly|shrooms?|ketamine|ket|lsd|대마|마리화나|코카인|엑스터시|필로폰|필로|헤로인|펜타닐|케타민|물뽕|야바|마약|financial[[:space:]]+product|investment[[:space:]]+(product|scheme)|loan[[:space:]]+offer|crypto(currency)?[[:space:]]+(investment|scheme)|forex|금융상품|투자상품|대출[[:space:]]*상품|가상화폐[[:space:]]*투자|외환[[:space:]]*투자|gambling|casino|sports[[:space:]]*bet(ting)?|bookmaker|pokies|도박|카지노|스포츠[[:space:]]*베팅|포키즈|sexual[[:space:]]+service|escort[[:space:]]+service|prostitution|sex[[:space:]]*work|성매매|성인[[:space:]]*서비스|출장안마|counterfeit|fake[[:space:]]+(designer|brand)|replica[[:space:]]+(designer|brand)|knock-?off|짝퉁|위조품|가품|recalled[[:space:]]+(product|item)|unsafe[[:space:]]+(product|item)|safety[[:space:]]+recall|리콜[[:space:]]*(제품|상품)?|안전[[:space:]]*리콜|불량[[:space:]]*제품|stolen[[:space:]]+(goods?|item|property)|hot[[:space:]]+goods|도난품|장물)'
  then
    raise exception 'This content cannot be published on Tada because it contains prohibited or unsafe material.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Replace the older marketplace-only trigger implementation.
drop trigger if exists reject_prohibited_market_listing on public.market_listings;
create trigger reject_prohibited_market_listing before insert or update on public.market_listings
for each row execute function public.reject_prohibited_public_content();

drop trigger if exists reject_prohibited_bargain_listing on public.bargain_listings;
create trigger reject_prohibited_bargain_listing before insert or update on public.bargain_listings
for each row execute function public.reject_prohibited_public_content();

drop trigger if exists reject_prohibited_bargain_listing_item on public.bargain_listing_items;
create trigger reject_prohibited_bargain_listing_item before insert or update on public.bargain_listing_items
for each row execute function public.reject_prohibited_public_content();

drop function if exists public.reject_prohibited_marketplace_item();

drop trigger if exists reject_prohibited_service_listing on public.service_listings;
create trigger reject_prohibited_service_listing before insert or update on public.service_listings
for each row execute function public.reject_prohibited_public_content();

drop trigger if exists reject_prohibited_community_post on public.community_posts;
create trigger reject_prohibited_community_post before insert or update on public.community_posts
for each row execute function public.reject_prohibited_public_content();

drop trigger if exists reject_prohibited_group_buy on public.group_buys;
create trigger reject_prohibited_group_buy before insert or update on public.group_buys
for each row execute function public.reject_prohibited_public_content();

drop trigger if exists reject_prohibited_group_buy_item on public.group_buy_items;
create trigger reject_prohibited_group_buy_item before insert or update on public.group_buy_items
for each row execute function public.reject_prohibited_public_content();

drop trigger if exists reject_prohibited_market_comment on public.market_listing_comments;
create trigger reject_prohibited_market_comment before insert or update on public.market_listing_comments
for each row execute function public.reject_prohibited_public_content();

drop trigger if exists reject_prohibited_bargain_comment on public.bargain_listing_comments;
create trigger reject_prohibited_bargain_comment before insert or update on public.bargain_listing_comments
for each row execute function public.reject_prohibited_public_content();

drop trigger if exists reject_prohibited_community_comment on public.community_post_comments;
create trigger reject_prohibited_community_comment before insert or update on public.community_post_comments
for each row execute function public.reject_prohibited_public_content();

drop trigger if exists reject_prohibited_service_review on public.service_reviews;
create trigger reject_prohibited_service_review before insert or update on public.service_reviews
for each row execute function public.reject_prohibited_public_content();
