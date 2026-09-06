import { Index2HomeClient } from "@/components/Index2HomeClient";
import { getServerUser } from "@/lib/auth-server";
import { getHomeCommunityHighlights } from "@/lib/community/home-highlights";
import { getHomeListingRails } from "@/lib/market/home-listings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Index2Page() {
  const user = await getServerUser();
  const supabase = await createServerSupabaseClient();
  const { data: profile } = user && supabase ? await supabase.from("profiles").select("region_city, region_suburb").eq("id", user.id).maybeSingle() : { data: null };
  const [rails, posts] = supabase ? await Promise.all([
    getHomeListingRails(supabase, { city: profile?.region_city, suburb: profile?.region_suburb, userId: user?.id }),
    getHomeCommunityHighlights(supabase),
  ]) : [{ nearbyListings: [], justListedListings: [], savedListingIds: [] }, []];
  const locationLabel = [profile?.region_suburb, profile?.region_city].filter((value): value is string => Boolean(value?.trim())).join(", ") || null;

  return <Index2HomeClient locationLabel={locationLabel} listings={[...rails.nearbyListings, ...rails.justListedListings]} savedListingIds={rails.savedListingIds} posts={posts} />;
}
