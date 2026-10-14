import { marketFeedQuerySchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { MARKET_PAGE_SIZE, getMarketFeed, getMergedMarketFeed } from "@/lib/market/feed";
import { loadPagedFeed } from "@/lib/market/paged-feed";
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
  const isMerged = url.searchParams.get("shopType") === "all";
  const loadFeed = (options: { pageSize?: number; page?: number }) => isMerged
    ? getMergedMarketFeed(supabase, query.data, user?.id, options)
    : getMarketFeed(supabase, query.data, user?.id, options);

  // The browse page asks for a numbered page so it can swap its own feed
  // instead of navigating; everything else still reads the cursor feed.
  const requestedPage = url.searchParams.get("page");
  if (!requestedPage) return apiSuccess(await loadFeed({ pageSize: searchPageSize }));
  const { feed, page, totalPages } = await loadPagedFeed(requestedPage, MARKET_PAGE_SIZE, (target) => loadFeed({ pageSize: MARKET_PAGE_SIZE, page: target }));
  return apiSuccess({ ...feed, page, totalPages });
}
