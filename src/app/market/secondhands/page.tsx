import { marketFeedQuerySchema } from "@/contracts/api";
import { MarketPageClient } from "@/components/market/MarketPageClient";
import { MARKET_PAGE_SIZE, getMarketFeed } from "@/lib/market/feed";
import { loadPagedFeed } from "@/lib/market/paged-feed";
import { resolveProfileAreaDefault } from "@/lib/market/starting-area";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Second Hands" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MarketSecondhandsRoute({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const rawParams = await searchParams;
  const rawQuery = {
    q: typeof rawParams.q === "string" ? rawParams.q : "",
    category: typeof rawParams.category === "string" ? rawParams.category : undefined,
    subcategory: typeof rawParams.subcategory === "string" ? rawParams.subcategory : undefined,
    maxPrice: typeof rawParams.maxPrice === "string" ? rawParams.maxPrice : undefined,
    condition: typeof rawParams.condition === "string" ? rawParams.condition : undefined,
    mainLocation: typeof rawParams.mainLocation === "string" ? rawParams.mainLocation : undefined,
    subLocation: typeof rawParams.subLocation === "string" ? rawParams.subLocation : undefined,
    sort: typeof rawParams.sort === "string" ? rawParams.sort : undefined,
  };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <MarketPageClient shopType="secondhand" basePath="/market/secondhands" />;
  const { data: { user } } = await supabase.auth.getUser();
  // An address with no area is a fresh visit, which starts on the profile's area.
  const { profileLocationDefault } = await resolveProfileAreaDefault(supabase, rawParams, user?.id ?? null);
  const query = marketFeedQuerySchema.parse({ ...rawQuery, mainLocation: rawQuery.mainLocation ?? (profileLocationDefault || undefined) });
  const { feed, page, totalPages } = await loadPagedFeed(
    typeof rawParams.page === "string" ? rawParams.page : undefined,
    MARKET_PAGE_SIZE,
    (target) => getMarketFeed(supabase, query, user?.id, { pageSize: MARKET_PAGE_SIZE, page: target }),
  );
  return <MarketPageClient shopType="secondhand" basePath="/market/secondhands" postedListings={feed.listings} savedListingIds={feed.savedListingIds} page={page} totalPages={totalPages} profileLocationDefault={profileLocationDefault} />;
}
