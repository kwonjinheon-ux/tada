import { Suspense } from "react";
import { CommunityPageClient } from "@/components/community/CommunityPageClient";
import type { CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { communityPostCategorySchema } from "@/contracts/api";
import { loadCommunityPostFeed, type CommunityFeedResult } from "@/lib/community/post-feed";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NZ_MAIN_LOCATIONS } from "@/data/nzLocations";

export const metadata = { title: "Community" };

// Rendering the first feed on the server removes the hydrate-then-fetch wait:
// the browser gets posts in the initial HTML instead of after its own round trip.
async function loadInitialPosts(category: CommunityCategory, search: string, searchBy: "all" | "id" | "title" | "content", page: number, mainLocation: string, subLocation: string, sort?: "recent" | "trending"): Promise<CommunityFeedResult | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  try {
    return await loadCommunityPostFeed(supabase, { category: category === "all" ? null : category, search, searchBy, page, mainLocation, subLocation, sort });
  } catch {
    return null;
  }
}

export default async function CommunityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requestedCategory = communityPostCategorySchema.safeParse(typeof params.category === "string" ? params.category : "");
  const category: CommunityCategory = requestedCategory.success ? requestedCategory.data : "all";
  const search = (typeof params.q === "string" ? params.q : "").trim().slice(0, 60);
  const searchBy = ["id", "title", "content"].includes(String(params.searchBy)) ? params.searchBy as "id" | "title" | "content" : "all";
  const page = typeof params.page === "string" && /^\d+$/.test(params.page) ? Math.max(1, Math.min(Number(params.page), 100000)) : 1;
  const sort = params.sort === "recent" || params.sort === "trending" ? params.sort : undefined;
  const mainLocation = NZ_MAIN_LOCATIONS.find((location) => location === params.mainLocation) ?? "";
  const subLocation = typeof params.subLocation === "string" ? params.subLocation : "";
  const initialPosts = await loadInitialPosts(category, search, searchBy, page, mainLocation, subLocation, sort);

  return <Suspense fallback={null}><CommunityPageClient initialCategory={category} initialFeed={initialPosts} initialFeedQuery={{ category, search, searchBy, page, mainLocation, subLocation, sort }} /></Suspense>;
}
