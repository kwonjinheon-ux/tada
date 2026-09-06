import { bargainFeedQuerySchema } from "@/contracts/api";
import { MarketShopFeedClient } from "@/components/market/MarketShopFeedClient";
import { getBargainFeed } from "@/lib/bargain/feed";
import { MARKET_PAGE_SIZE } from "@/lib/market/feed";
import { loadPagedFeed } from "@/lib/market/paged-feed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Moving Sales | Tada" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MovingSalesRoute({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const rawParams = await searchParams;
  const query = bargainFeedQuerySchema.parse({
    q: typeof rawParams.q === "string" ? rawParams.q : "",
    sort: typeof rawParams.sort === "string" ? rawParams.sort : undefined,
    mainLocation: typeof rawParams.mainLocation === "string" ? rawParams.mainLocation : undefined,
    subLocation: typeof rawParams.subLocation === "string" ? rawParams.subLocation : undefined,
    category: typeof rawParams.category === "string" ? rawParams.category : undefined,
    subcategory: typeof rawParams.subcategory === "string" ? rawParams.subcategory : undefined,
    maxPrice: typeof rawParams.maxPrice === "string" ? rawParams.maxPrice : undefined,
    condition: typeof rawParams.condition === "string" ? rawParams.condition : undefined,
  });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <MarketShopFeedClient shopType="moving-sale" basePath="/market/moving-sales" listings={[]} />;
  const { data: { user } } = await supabase.auth.getUser();
  const { feed, page, totalPages } = await loadPagedFeed(
    typeof rawParams.page === "string" ? rawParams.page : undefined,
    MARKET_PAGE_SIZE,
    (target) => getBargainFeed(supabase, query, user?.id, { bargainTypes: ["moving-sale"], pageSize: MARKET_PAGE_SIZE, page: target }),
  );
  return <MarketShopFeedClient shopType="moving-sale" basePath="/market/moving-sales" listings={feed.listings} savedListingIds={feed.savedListingIds} page={page} totalPages={totalPages} />;
}
