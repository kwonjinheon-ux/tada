import { marketFeedQuerySchema } from "@/contracts/api";
import { MarketPageClient } from "@/components/market/MarketPageClient";
import { getMarketFeed } from "@/lib/market/feed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Market" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MarketSecondhandsRoute({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
  if (!supabase) return <MarketPageClient shopType="secondhand" basePath="/market/secondhands" />;
  const { data: { user } } = await supabase.auth.getUser();
  const feed = await getMarketFeed(supabase, query, user?.id);
  return <MarketPageClient shopType="secondhand" basePath="/market/secondhands" postedListings={feed.listings} savedListingIds={feed.savedListingIds} nextCursor={feed.nextCursor} />;
}
