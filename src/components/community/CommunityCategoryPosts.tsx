"use client";

import { useEffect, useState } from "react";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { useLanguage } from "@/components/LanguageProvider";
import type { CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { communityPostFeedResponseSchema } from "@/contracts/api";
import type { CommunityPost } from "@/data/community-posts";
import { readApiResponse } from "@/lib/api/client";

/** Reuses the community list card for posts from the category that led here. */
export function CommunityCategoryPosts({ category, currentPostId }: { category: Exclude<CommunityCategory, "all">; currentPostId: string }) {
  const { locale } = useLanguage();
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
  const heading = locale === "ko" ? "이 카테고리의 다른 글" : "More in this category";
  return <section className="community-category-posts" aria-label={heading}><h2>{heading}</h2><div className="community-post-list">{posts.map((post) => <CommunityPostCard key={post.id} post={post} showTypeBadge={false} href={`/community/${post.id}?category=${category}`} />)}</div></section>;
}
