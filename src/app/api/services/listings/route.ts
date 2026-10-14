import { apiFailure, apiSuccess } from "@/lib/api/response";
import { loadServicesFeed } from "@/lib/services/feed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Services are unavailable right now.", 503);
  const url = new URL(request.url);
  const feed = await loadServicesFeed(supabase, {
    category: url.searchParams.get("category"),
    mainLocation: url.searchParams.get("mainLocation"),
    subLocation: url.searchParams.get("subLocation"),
  });
  return apiSuccess(feed);
}
