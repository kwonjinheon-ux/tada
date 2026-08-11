import { bargainFeedQuerySchema } from "@/contracts/api";
import { MarketShopFeedClient } from "@/components/market/MarketShopFeedClient";
import { getBargainFeed } from "@/lib/bargain/feed";
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
  if (!supabase) return <MarketShopFeedClient shopType="moving-sale" basePath="/market/moving-sales" emptyLabel="No moving sales found yet" listings={[]} />;
  const { data: { user } } = await supabase.auth.getUser();
  const feed = await getBargainFeed(supabase, query, user?.id, { bargainTypes: ["moving-sale"] });
  return <MarketShopFeedClient shopType="moving-sale" basePath="/market/moving-sales" emptyLabel="No moving sales found yet" listings={feed.listings} savedListingIds={feed.savedListingIds} />;
}
