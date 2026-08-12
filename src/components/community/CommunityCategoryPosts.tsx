"use client";

import { useEffect, useState } from "react";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import type { CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { communityPostFeedResponseSchema } from "@/contracts/api";
import type { CommunityPost } from "@/data/community-posts";
import { readApiResponse } from "@/lib/api/client";

/** Reuses the community list card for posts from the category that led here. */
export function CommunityCategoryPosts({ category, currentPostId }: { category: Exclude<CommunityCategory, "all">; currentPostId: string }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/community/posts?category=${encodeURIComponent(category)}`, { signal: controller.signal })
      .then((response) => readApiResponse(response, communityPostFeedResponseSchema))
      .then((result) => { if (result.data) setPosts(result.data.posts.filter((post) => post.id !== currentPostId)); })
      .catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setPosts([]); });
    return () => controller.abort();
  }, [category, currentPostId]);

  if (!posts.length) return null;
  return <section className="community-category-posts" aria-label="More posts in this category"><h2>More in this category</h2><div className="community-post-list">{posts.map((post) => <CommunityPostCard key={post.id} post={post} showTypeBadge={false} />)}</div></section>;
}
