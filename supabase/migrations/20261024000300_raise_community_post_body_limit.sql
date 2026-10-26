-- A community post may now hold 10,000 characters of body instead of 5,000.
--
-- The limit counts the stored HTML, not just the words. A table pasted from a page or a
-- spreadsheet carries a tag pair for every row and cell, so a table of a few dozen cells
-- used up a large part of the old limit and a post with one could be refused while the
-- words in it were short.
--
-- Doubled rather than removed because the feed sends each post's whole body to the browser
-- as a card: every character allowed here is a character on the list page for every reader.
--
-- The check was created inline, so it has Postgres's default name; it is found by what it
-- says rather than by that name, in case it was ever renamed. Loosening a check cannot
-- reject a row that was valid before, so this is safe to run before the application that
-- relies on it is deployed, and the application must not go first.

do $$
declare
  old_check text;
begin
  for old_check in
    select conname
    from pg_constraint
    where conrelid = 'public.community_posts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%char_length(TRIM(BOTH FROM body))%'
  loop
    execute format('alter table public.community_posts drop constraint %I', old_check);
  end loop;
end;
$$;

alter table public.community_posts
  add constraint community_posts_body_check
  check (char_length(trim(body)) between 20 and 10000);
