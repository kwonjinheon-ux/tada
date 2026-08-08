import { bargainFeedQuerySchema } from "@/contracts/api";
import { BargainPageClient } from "@/components/bargain/BargainPageClient";
import { getMarketFeed } from "@/lib/market/feed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Bargain | Tada" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function BargainPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = bargainFeedQuerySchema.parse({
    q: typeof params.q === "string" ? params.q : "",
    sort: typeof params.sort === "string" ? params.sort : undefined,
    mainLocation: typeof params.mainLocation === "string" ? params.mainLocation : undefined,
    subLocation: typeof params.subLocation === "string" ? params.subLocation : undefined,
    bargain: typeof params.bargain === "string" ? params.bargain : undefined,
  });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <BargainPageClient />;
  const { data: { user } } = await supabase.auth.getUser();
  const feed = await getMarketFeed(supabase, query, user?.id);
  return <BargainPageClient postedListings={feed.listings} savedListingIds={feed.savedListingIds} />;
}
