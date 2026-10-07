import { HomePageClient } from "@/components/HomePageClient";
import { getServerUser } from "@/lib/auth-server";
import { getHomeCommunityHighlights } from "@/lib/community/home-highlights";
import { getHomeListingRails } from "@/lib/market/home-listings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [user, supabase] = await Promise.all([getServerUser(), createServerSupabaseClient()]);
  const communityHighlightsPromise = supabase ? getHomeCommunityHighlights(supabase) : Promise.resolve([]);
  const { data: profile } = user && supabase
    ? await supabase.from("profiles").select("region_city, region_suburb").eq("id", user.id).maybeSingle()
    : { data: null };
  const locationLabel = [profile?.region_suburb, profile?.region_city]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .join(", ");
  const [homeListings, communityHighlights] = supabase
    ? await Promise.all([
      getHomeListingRails(supabase, {
        city: profile?.region_city,
        suburb: profile?.region_suburb,
        userId: user?.id,
      }),
      communityHighlightsPromise,
    ])
    : [{
      nearbyListings: [], justListedListings: [], savedListingIds: [],
    }, []];

  return <HomePageClient communityHighlights={communityHighlights} locationLabel={locationLabel || null} {...homeListings} />;
}
