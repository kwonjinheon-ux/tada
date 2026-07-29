import { marketFeedQuerySchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { getMarketFeed } from "@/lib/market/feed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Marketplace browsing is unavailable right now.", 503);
  const query = marketFeedQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return apiFailure("BAD_REQUEST", "Invalid marketplace search parameters.", 400);
  const { data: { user } } = await supabase.auth.getUser();
  return apiSuccess(await getMarketFeed(supabase, query.data, user?.id));
}
