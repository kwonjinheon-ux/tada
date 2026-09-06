import { marketFeedQuerySchema } from "@/contracts/api";
import { MarketPageClient } from "@/components/market/MarketPageClient";
import { MARKET_PAGE_SIZE, getMergedMarketFeed } from "@/lib/market/feed";
import { parsePageParam, totalPageCount } from "@/lib/list-pagination";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Market" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MarketRoute({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const rawParams = await searchParams;
  const query = marketFeedQuerySchema.parse({
    q: typeof rawParams.q === "string" ? rawParams.q : "",
    category: typeof rawParams.category === "string" ? rawParams.category : undefined,
    subcategory: typeof rawParams.subcategory === "string" ? rawParams.subcategory : undefined,
    maxPrice: typeof rawParams.maxPrice === "string" ? rawParams.maxPrice : undefined,
    condition: typeof rawParams.condition === "string" ? rawParams.condition : undefined,
    mainLocation: typeof rawParams.mainLocation === "string" ? rawParams.mainLocation : undefined,
    subLocation: typeof rawParams.subLocation === "string" ? rawParams.subLocation : undefined,
    sort: typeof rawParams.sort === "string" ? rawParams.sort : undefined,
  });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <MarketPageClient shopType="all" basePath="/market" />;
  const { data: { user } } = await supabase.auth.getUser();
  // The page is read before the total is known, so an out-of-range ?page= is
  // clamped once the count comes back rather than rendering an empty grid.
  const requestedPage = Number.parseInt(typeof rawParams.page === "string" ? rawParams.page : "1", 10);
  const firstPass = await getMergedMarketFeed(supabase, query, user?.id, { pageSize: MARKET_PAGE_SIZE, page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1 });
  const totalPages = totalPageCount(firstPass.total, MARKET_PAGE_SIZE);
  const page = parsePageParam(typeof rawParams.page === "string" ? rawParams.page : undefined, totalPages);
  const feed = page === (Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1)
    ? firstPass
    : await getMergedMarketFeed(supabase, query, user?.id, { pageSize: MARKET_PAGE_SIZE, page });
  return <MarketPageClient shopType="all" basePath="/market" postedListings={feed.listings} savedListingIds={feed.savedListingIds} page={page} totalPages={totalPages} />;
}
