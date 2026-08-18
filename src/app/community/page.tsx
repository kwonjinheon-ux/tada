import { Suspense } from "react";
import { CommunityPageClient } from "@/components/community/CommunityPageClient";
import type { CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import type { CommunityPost } from "@/data/community-posts";
import { communityPostCategorySchema } from "@/contracts/api";
import { loadCommunityPostFeed } from "@/lib/community/post-feed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Community" };

// Rendering the first feed on the server removes the hydrate-then-fetch wait:
// the browser gets posts in the initial HTML instead of after its own round trip.
async function loadInitialPosts(category: CommunityCategory, search: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  try {
    return await loadCommunityPostFeed(supabase, { category: category === "all" ? null : category, search }) as CommunityPost[];
  } catch {
    return null;
  }
}

export default async function CommunityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requestedCategory = communityPostCategorySchema.safeParse(typeof params.category === "string" ? params.category : "");
  const category: CommunityCategory = requestedCategory.success ? requestedCategory.data : "all";
  const search = (typeof params.q === "string" ? params.q : "").trim().slice(0, 60);
  const initialPosts = await loadInitialPosts(category, search);

  return <Suspense fallback={null}><CommunityPageClient initialCategory={category} initialPosts={initialPosts} /></Suspense>;
}
