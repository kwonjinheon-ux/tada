import { marketFeedQuerySchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { getMarketFeed, getMergedMarketFeed } from "@/lib/market/feed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Marketplace browsing is unavailable right now.", 503);
  const url = new URL(request.url);
  const query = marketFeedQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success) return apiFailure("BAD_REQUEST", "Invalid marketplace search parameters.", 400);
  const requestedLimit = Number(url.searchParams.get("limit"));
  const searchPageSize = query.data.q && Number.isInteger(requestedLimit) && requestedLimit > 0 && requestedLimit <= 100
    ? requestedLimit
    : undefined;
  const { data: { user } } = await supabase.auth.getUser();
  const feed = url.searchParams.get("shopType") === "all"
    ? await getMergedMarketFeed(supabase, query.data, user?.id, { pageSize: searchPageSize })
    : await getMarketFeed(supabase, query.data, user?.id, { pageSize: searchPageSize });
  return apiSuccess(feed);
}
