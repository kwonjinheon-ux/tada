alter table public.ai_generation_usage
drop constraint ai_generation_usage_feature_check;

alter table public.ai_generation_usage
add constraint ai_generation_usage_feature_check
check (feature in ('listing_description', 'bargain_item_descriptions'));
