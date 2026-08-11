"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { communityPostTypeLabelKeys, type CommunityPost } from "@/data/community-posts";

export function CommunityRecentPostsPanel({ posts }: { posts: CommunityPost[] }) {
  const { t } = useLanguage();

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
