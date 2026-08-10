import { bargainFeedQuerySchema } from "@/contracts/api";
import { BargainPageClient } from "@/components/bargain/BargainPageClient";
import { getBargainFeed } from "@/lib/bargain/feed";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth-server";

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
  const [feed, user] = await Promise.all([getBargainFeed(supabase, query), getServerUser()]);
  const { data: savedRows } = user
    ? await supabase.from("bargain_wishlist").select("listing_id").eq("user_id", user.id)
    : { data: [] };
  return <BargainPageClient postedListings={feed.listings} savedListingIds={(savedRows ?? []).map((row) => row.listing_id)} />;
}
