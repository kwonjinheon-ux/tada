-- Views in public must apply the caller's grants and RLS policies.
alter view public.active_ad_candidates
  set (security_invoker = true);
