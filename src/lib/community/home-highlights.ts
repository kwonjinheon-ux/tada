import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunityPost, CommunityPostType } from "@/data/community-posts";

type CommunityHighlightRow = {
  id: string;
  post_type: string;
  title: string;
  body: string;
  region_city: string | null;
  region_suburb: string | null;
  created_at: string;
  view_count: number | null;
  score: number | null;
  share_count: number | null;
};

const validPostTypes = new Set<CommunityPostType>(["event", "question", "recommendation", "free", "notice", "housing"]);

function relativeTime(createdAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Home shows the latest community conversations, matching the user's immediate local pulse. */
export async function getHomeCommunityHighlights(supabase: SupabaseClient): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("id,post_type,title,body,region_city,region_suburb,created_at,view_count,score,share_count")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) return [];

  const posts = ((data ?? []) as CommunityHighlightRow[])
    .filter((post) => post && validPostTypes.has(post.post_type as CommunityPostType));
  const postIds = posts.map((post) => post.id);
  const { data: commentRows } = postIds.length
    ? await supabase.from("community_post_comments").select("post_id").in("post_id", postIds).is("deleted_at", null)
    : { data: [] as { post_id: string }[] };
  const commentCounts = new Map<string, number>();
  for (const comment of commentRows ?? []) {
    commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1);
  }

  return posts.map((post) => ({
      id: post.id,
      type: post.post_type as CommunityPostType,
      title: post.title,
      excerpt: post.body,
      location: [post.region_suburb, post.region_city].filter(Boolean).join(", ") || "New Zealand",
      timeAgo: relativeTime(post.created_at),
      viewCount: post.view_count ?? 0,
      score: post.score ?? 0,
      shareCount: post.share_count ?? 0,
      responseCount: commentCounts.get(post.id) ?? 0,
    } satisfies CommunityPost));
}
