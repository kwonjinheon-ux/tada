"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { CommunityPostSaveButton } from "@/components/community/CommunityPostSaveButton";
import { communityPostTypeLabelKeys, type CommunityPost } from "@/data/community-posts";

export function CommunityPostCard({ post, showTypeBadge = true, mutedTypeBadge = false, href }: { post: CommunityPost; showTypeBadge?: boolean; mutedTypeBadge?: boolean; href?: string }) {
  const { t } = useLanguage();
  const responseCount = post.responseCount ?? 0;
  const countTone = responseCount <= 10 ? "low" : responseCount <= 20 ? "medium" : responseCount <= 30 ? "high" : "hot";
  const excerpt = post.excerpt.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const featuredImage = post.images?.[0] ?? (post.image ? { src: post.image, alt: post.imageAlt ?? "" } : null);
  return (
    <article className={`community-post-card community-post-card-${post.type}`}>
      <Link className="community-post-card-link" href={href ?? `/community/${post.id}`} aria-label={`Open ${post.title}`} onClick={() => { void fetch(`/api/community/posts/${post.id}/view`, { method: "POST", keepalive: true }); }}>
        {featuredImage ? <div className="community-post-media"><img src={featuredImage.src} alt={featuredImage.alt} /></div> : null}
        <div className="community-post-body">
          <div className="community-post-title-row">
            {showTypeBadge ? <span className={`community-post-badge community-post-badge-${post.type} ${mutedTypeBadge ? "is-muted" : ""}`}>{t(communityPostTypeLabelKeys[post.type])}</span> : null}
            <h2>{post.title}</h2>
            {responseCount > 0 ? <span className={`community-post-comment-count is-${countTone}`} aria-label={`${responseCount} comments`}>{responseCount}</span> : null}
          </div>
          <p className="community-post-excerpt">{excerpt}</p>
          <div className="community-post-meta">
            <span><i className="fa-regular fa-eye" aria-hidden="true" />{new Intl.NumberFormat("en-NZ").format(post.viewCount ?? 0)}</span>
            <span><i className="fa-solid fa-location-dot" aria-hidden="true" />{post.location}</span>
            {post.eventDate ? <span><i className="fa-regular fa-calendar" aria-hidden="true" />{post.eventDate}</span> : null}
            {post.timeAgo ? <span><i className="fa-regular fa-clock" aria-hidden="true" />{post.timeAgo}</span> : null}
            <span className="community-post-author">{post.authorName ?? t("communityMemberFallback")}</span>
          </div>
        </div>
      </Link>
      <CommunityPostSaveButton postId={post.id} initialIsSaved={post.isSaved} className="community-post-card-save" />
    </article>
  );
}
