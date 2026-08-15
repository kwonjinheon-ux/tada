"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { communityPostFeedResponseSchema } from "@/contracts/api";
import { communityPostTypeLabelKeys, type CommunityPost } from "@/data/community-posts";
import { readApiResponse } from "@/lib/api/client";

// One desktop rail adapts its data source to the selected community category.
export function CommunityRecentPostsPanel({ category = "all" }: { category?: CommunityCategory }) {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ sort: "recent" });
    if (category !== "all") params.set("category", category);

    void fetch(`/api/community/posts?${params}`, { signal: controller.signal })
      .then((response) => readApiResponse(response, communityPostFeedResponseSchema))
      .then((result) => { if (result.data) setPosts(result.data.posts); })
      .catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setPosts([]); });

    return () => controller.abort();
  }, [category]);

  return (
    <aside className="community-recent-panel" aria-label={t("communityRecentPostsHeading")}>
      <Link className="community-recent-ad-slot" href="/market">
        <Image src="/images/home/journey-market.png" alt="Discover home finds on Tada Market" fill sizes="300px" />
        <span className="community-recent-ad-label">Advertisement</span>
        <span className="community-recent-ad-copy"><strong>Fresh finds for your home</strong><small>Explore Tada Market</small></span>
      </Link>
      <div className="community-recent-panel-heading">
        <h2>{t("communityRecentPostsHeading")}</h2>
      </div>
      <div className="community-recent-panel-list">
        {posts.map((post) => (
          <article className={`community-recent-post ${post.image ? "" : "community-recent-post-no-media"}`} key={post.id}>
            <Link className="community-recent-post-link" href={`/community/${post.id}${category === "all" ? "" : `?category=${category}`}`}>
              <div className="community-recent-post-body">
                <span className="community-recent-post-meta">{t(communityPostTypeLabelKeys[post.type])} · {post.timeAgo ?? post.eventDate ?? t("communityNewPost")}</span>
                <h3>{post.title}</h3>
                <span className="community-recent-post-stats">{post.responseCount != null ? `${post.responseCount} ${t("communityResponses")}` : t("communityNoResponsesYet")}</span>
              </div>
              {post.image ? <div className="community-recent-post-media"><img src={post.image} alt="" /></div> : null}
            </Link>
          </article>
        ))}
      </div>
    </aside>
  );
}
