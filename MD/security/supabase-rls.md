# Security Baseline

## Non-negotiable rules

1. Enable RLS on every public table and storage bucket.
2. The browser only receives `NEXT_PUBLIC_SUPABASE_URL` and the anon key.
3. `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never enter browser code, logs, Git or analytics.
4. Every data mutation validates input twice: Zod at the application boundary and database constraints in PostgreSQL.
5. Listing images use a private bucket with signed URLs. Do not make user uploads public by default.
6. Authorize ownership in RLS; never trust an `owner_id` submitted by the browser without a matching `auth.uid()` check.

## Applied baseline

`supabase/migrations/202607110001_initial_marketplace.sql` creates profiles, listings, ownership policies, private listing storage and indexes.

## Auth implementation path

- Use Supabase Auth with PKCE for browser sign-in.
- Add `@supabase/ssr` when authentication pages become functional, then create cookie-aware server and middleware clients.
- Keep privileged flows (moderation, admin reports, signed URL creation) in server routes or server actions only.
- Add rate limiting and CAPTCHA to sign-up, listing submission and messaging before public launch.

## Security verification before launch

- Test every table and storage action with both anonymous and another authenticated user.
- Confirm no service role key exists in the built client bundle.
- Run dependency audit and secret scan in CI.
- Define backups, retention, incident response and deletion workflows.
