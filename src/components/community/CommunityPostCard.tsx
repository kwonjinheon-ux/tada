"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { communityPostTypeLabelKeys, type CommunityPost } from "@/data/community-posts";
import { CommunityPostActions } from "@/components/community/CommunityPostActions";

export function CommunityPostCard({ post, showTypeBadge = true }: { post: CommunityPost; showTypeBadge?: boolean }) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const responseCount = post.responseCount ?? 0;
  const countTone = responseCount <= 10 ? "low" : responseCount <= 20 ? "medium" : responseCount <= 30 ? "high" : "hot";
  const excerpt = post.excerpt.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const featuredImage = post.images?.[0] ?? (post.image ? { src: post.image, alt: post.imageAlt ?? "" } : null);
  const toggle = () => setIsExpanded((expanded) => !expanded);

  return (
    <article className={`community-post-card community-post-card-${post.type} ${isExpanded ? "is-expanded" : ""}`} role="button" tabIndex={0} aria-expanded={isExpanded} onClick={toggle} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); } }}>
      <div className="community-post-media">
        {featuredImage ? <img src={featuredImage.src} alt={featuredImage.alt} /> : <span className="community-post-placeholder">txt</span>}
      </div>
      <div className="community-post-body">
        <div className="community-post-title-row">
          {showTypeBadge ? <span className={`community-post-badge community-post-badge-${post.type}`}>{t(communityPostTypeLabelKeys[post.type])}</span> : null}
          <h2>{post.title}</h2>
          {responseCount > 0 ? <span className={`community-post-comment-count is-${countTone}`} aria-label={`${responseCount} comments`}><i className="fa-regular fa-comment" aria-hidden="true" />{responseCount}</span> : null}
        </div>
        <p className="community-post-excerpt">{excerpt}</p>
        <div className="community-post-meta">
          <span><i className="fa-solid fa-location-dot" aria-hidden="true" />{post.location}</span>
          {post.eventDate ? <span><i className="fa-regular fa-calendar" aria-hidden="true" />{post.eventDate}</span> : null}
          {post.timeAgo ? <span><i className="fa-regular fa-clock" aria-hidden="true" />{post.timeAgo}</span> : null}
        </div>
        {isExpanded ? <CommunityPostActions postId={post.id} commentCount={responseCount} compact hideComments /> : null}
      </div>
    </article>
  );
}
