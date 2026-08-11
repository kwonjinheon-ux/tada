import { bargainFeedQuerySchema } from "@/contracts/api";
import { MarketShopFeedClient } from "@/components/market/MarketShopFeedClient";
import { getBargainFeed } from "@/lib/bargain/feed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "2 Dollar Shop | Tada" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TwoDollarShopRoute({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
  if (!supabase) return <MarketShopFeedClient shopType="2dollarshop" basePath="/market/2dollarshop" emptyLabel="No deals found yet" listings={[]} />;
  const { data: { user } } = await supabase.auth.getUser();
  const feed = await getBargainFeed(supabase, query, user?.id, { bargainTypes: ["2-dollar-deals", "5-dollar-deals", "10-dollar-deals"] });
  return <MarketShopFeedClient shopType="2dollarshop" basePath="/market/2dollarshop" emptyLabel="No deals found yet" listings={feed.listings} savedListingIds={feed.savedListingIds} />;
}
