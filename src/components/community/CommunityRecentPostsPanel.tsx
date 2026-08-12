"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { communityPostFeedResponseSchema } from "@/contracts/api";
import { communityPostTypeLabelKeys, type CommunityPost } from "@/data/community-posts";
import { readApiResponse } from "@/lib/api/client";

export function CommunityRecentPostsPanel({ posts: initialPosts }: { posts?: CommunityPost[] }) {
  const { t } = useLanguage();
  const [fetchedPosts, setFetchedPosts] = useState<CommunityPost[]>([]);
  const posts = initialPosts ?? fetchedPosts;

  useEffect(() => {
    if (initialPosts) return;
    const controller = new AbortController();
    void fetch("/api/community/posts", { signal: controller.signal })
      .then((response) => readApiResponse(response, communityPostFeedResponseSchema))
      .then((result) => { if (result.data) setFetchedPosts(result.data.posts.slice(0, 4)); })
      .catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setFetchedPosts([]); });
    return () => controller.abort();
  }, [initialPosts]);

  return (
    <aside className="community-recent-panel" aria-label={t("communityRecentPostsHeading")}>
      <div className="community-recent-panel-heading">
        <h2>{t("communityRecentPostsHeading")}</h2>
      </div>
      <div className="community-recent-panel-list">
        {posts.map((post) => (
          <article className="community-recent-post" key={post.id}>
            <div className="community-recent-post-body">
              <span className="community-recent-post-meta">{t(communityPostTypeLabelKeys[post.type])} · {post.timeAgo ?? post.eventDate ?? t("communityNewPost")}</span>
              <h3>{post.title}</h3>
              <span className="community-recent-post-stats">{post.responseCount != null ? `${post.responseCount} ${t("communityResponses")}` : t("communityNoResponsesYet")}</span>
            </div>
            <div className="community-recent-post-media">
              {post.image ? <img src={post.image} alt="" /> : <span className="community-recent-post-placeholder">txt</span>}
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
