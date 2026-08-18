create or replace function public.reject_prohibited_marketplace_item()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  content text;
begin
  content := lower(concat_ws(' ', to_jsonb(new) ->> 'title', to_jsonb(new) ->> 'description', to_jsonb(new) ->> 'category_slug', to_jsonb(new) ->> 'subcategory_slug'));

  if content ~ '(firearm|gun|rifle|shotgun|handgun|pistol|ammunition|ammo|weapon|taser|총기|권총|소총|산탄총|탄약|무기|전기충격기|prescription[[:space:]]*(medicine|medication|drug)|rx[[:space:]]*(medicine|medication|drug)|antibiotic|opioid|처방약|처방전[[:space:]]*약|항생제|마약성[[:space:]]*진통제|tobacco|cigarette|cigar|vape|e-?cig|nicotine|담배|전자담배|액상|니코틴|alcohol|beer|wine|spirits?|liquor|whisky|whiskey|vodka|술|맥주|와인|위스키|보드카|주류|recreational[[:space:]]+drug|cannabis|marijuana|weed|cocaine|mdma|ecstasy|meth(amphetamine)?|대마|마리화나|코카인|엑스터시|필로폰|마약|financial[[:space:]]+product|investment[[:space:]]+(product|scheme)|loan[[:space:]]+offer|crypto(currency)?[[:space:]]+(investment|scheme)|forex|금융상품|투자상품|대출[[:space:]]*상품|가상화폐[[:space:]]*투자|외환[[:space:]]*투자|gambling|casino|sports[[:space:]]*bet(ting)?|bookmaker|pokies|도박|카지노|스포츠[[:space:]]*베팅|포키즈|sexual[[:space:]]+service|escort[[:space:]]+service|prostitution|sex[[:space:]]*work|성매매|성인[[:space:]]*서비스|출장샵|counterfeit|fake[[:space:]]+(designer|brand)|replica[[:space:]]+(designer|brand)|knock-?off|짝퉁|위조품|가품|recalled[[:space:]]+(product|item)|unsafe[[:space:]]+(product|item)|safety[[:space:]]+recall|리콜[[:space:]]*(제품|상품)?|안전[[:space:]]*리콜|불량[[:space:]]*제품|stolen[[:space:]]+(goods?|item|property)|hot[[:space:]]+goods|도난품|장물)'
  then
    raise exception 'This item cannot be listed on Tada because it is a prohibited item.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger reject_prohibited_market_listing
before insert or update of title, description, category_slug, subcategory_slug
on public.market_listings
for each row execute function public.reject_prohibited_marketplace_item();

create trigger reject_prohibited_bargain_listing
before insert or update of title, description, category_slug, subcategory_slug
on public.bargain_listings
for each row execute function public.reject_prohibited_marketplace_item();

create trigger reject_prohibited_bargain_listing_item
before insert or update of title, description, category_slug
on public.bargain_listing_items
for each row execute function public.reject_prohibited_marketplace_item();
