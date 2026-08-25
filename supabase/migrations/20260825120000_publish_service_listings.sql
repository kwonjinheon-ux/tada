-- Service listings were created with the column default, 'pending'. Nothing in
-- the product ever moved them off it: there is no moderation queue for
-- services the way there is for market listings, and the admin area does not
-- touch service_listings at all. The RLS policy is
--   status = 'published' or owner_id = auth.uid()
-- so every service anyone submitted has been visible only to its own author,
-- and only while their session was live. Market listings default to
-- 'published'; services should behave the same way.

-- Release the listings that were stranded by the old default. 'hidden' and
-- 'archived' are deliberate states and are left alone.
update public.service_listings
set status = 'published'
where status = 'pending';

-- Stop the default from stranding the next one, alongside the create path now
-- setting the status explicitly.
alter table public.service_listings
  alter column status set default 'published';
