import { CommunityPageClient } from "@/components/community/CommunityPageClient";
// The sidebar is a client module, and a server component importing a value
// from one receives a client reference rather than the list. The contract
// holds the same slugs as plain data.
import { communityPostCategorySchema } from "@/contracts/api";
import type { CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { NZ_MAIN_LOCATIONS, type MainLocation } from "@/data/nzLocations";
import { loadCommunityPostFeed } from "@/lib/community/post-feed";
import { loadProfileLocation } from "@/lib/market/profile-main-location";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Community",
  description: "Local noticeboards, events, questions and recommendations from neighbours across New Zealand.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

/**
 * The browse page, served with the posts already in it.
 *
 * It used to ship a skeleton and let the browser fetch the feed once it had
 * hydrated, which is a whole round trip after the HTML has arrived — the one
 * browse surface still doing that. The reading of the URL here is deliberately
 * the same reading the client does, so the feed the server sends is the one the
 * client is about to look for in its cache and it does not ask again. Every
 * category, search, area and page is served this way, not only the default
 * view; from there the client swaps feeds as the reader moves.
 *
 * It also settles where a signed-in reader starts. A visit with no area on the
 * address begins on the profile's area, as every browse page does. That used to
 * be found out in the browser after the page was drawn, so the page was drawn for
 * everywhere and then drawn again once the profile had been read. Reading it here
 * means the first paint is the one that stays.
 */
export default async function CommunityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const rawParams = await searchParams;
  const requestedCategory = communityPostCategorySchema.safeParse(single(rawParams.category));
  const category: CommunityCategory = requestedCategory.success ? requestedCategory.data : "all";
  const requestedSort = single(rawParams.sort);
  const sort: "recent" | "trending" | undefined = requestedSort === "recent" || requestedSort === "trending" ? requestedSort : undefined;
  const requestedPage = Number(single(rawParams.page) || "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search = single(rawParams.q).trim().slice(0, 60);
  const searchBy = single(rawParams.searchBy) || "all";
  const requestedLocation = single(rawParams.mainLocation);
  const requestedMainLocation = NZ_MAIN_LOCATIONS.find((location) => location === requestedLocation) ?? "";
  const subLocation = single(rawParams.subLocation);

  const supabase = await createServerSupabaseClient();
  if (!supabase) return <CommunityPageClient initialCategory={category} />;

  // An address that names an area, even the empty one that means "All New Zealand",
  // is the reader's choice and is left alone. Only an address with no area at all is a
  // fresh visit, which is when the profile's area fills in.
  const hasAreaOnUrl = "mainLocation" in rawParams || "subLocation" in rawParams;
  let viewerId: string | null | undefined;
  let profileLocationDefault: MainLocation | "" | undefined;
  if (!hasAreaOnUrl) {
    const { data: { user } } = await supabase.auth.getUser();
    viewerId = user?.id ?? null;
    profileLocationDefault = (user ? (await loadProfileLocation(supabase, user.id))?.mainLocation : undefined) ?? "";
  }
  const mainLocation = requestedMainLocation || profileLocationDefault || "";

  const feedQuery = {
    category,
    search,
    searchBy: ["all", "id", "title", "content"].includes(searchBy) ? searchBy as "all" | "id" | "title" | "content" : "all",
    mainLocation,
    subLocation,
    sort,
    page,
  };
  const feed = await loadCommunityPostFeed(supabase, {
    ...feedQuery,
    category: category === "all" ? null : category,
    mainLocation: mainLocation || null,
    subLocation: subLocation || null,
    viewerId,
  });

  return <CommunityPageClient initialCategory={category} initialFeed={feed} initialFeedQuery={feedQuery} profileLocationDefault={profileLocationDefault} />;
}
