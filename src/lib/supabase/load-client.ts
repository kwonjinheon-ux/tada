/**
 * The root layout's Supabase calls (who is signed in, unread counts, language) all run after
 * the page has hydrated. The browser client is about 50 KB gzipped, so it is fetched on demand
 * here instead of being part of the bundle every page has to parse before it can become
 * interactive. Pages that use the client directly are unaffected.
 */
export async function loadBrowserSupabaseClient() {
  const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
  return createBrowserSupabaseClient();
}
