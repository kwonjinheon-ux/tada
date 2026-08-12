import { useLanguage } from "@/components/LanguageProvider";
import { communityPostTypeLabelKeys, type CommunityPost } from "@/data/community-posts";
import { CommunityPostActions } from "@/components/community/CommunityPostActions";

export function CommunityPostCard({ post, showTypeBadge = true, onOpen }: { post: CommunityPost; showTypeBadge?: boolean; onOpen?: () => void }) {
  const { t } = useLanguage();
  const responseCount = post.responseCount ?? 0;
  const countTone = responseCount <= 10 ? "low" : responseCount <= 20 ? "medium" : responseCount <= 30 ? "high" : "hot";
  const excerpt = post.excerpt.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  return (
    <article className={`community-post-card community-post-card-${post.type}`} role={onOpen ? "button" : undefined} tabIndex={onOpen ? 0 : undefined} onClick={onOpen} onKeyDown={(event) => { if (onOpen && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onOpen(); } }}>
      <div className="community-post-media">
        {post.image ? <img src={post.image} alt={post.imageAlt ?? ""} /> : <span className="community-post-placeholder">txt</span>}
      </div>
      <div className="community-post-body">
        {showTypeBadge ? <span className={`community-post-badge community-post-badge-${post.type}`}>{t(communityPostTypeLabelKeys[post.type])}</span> : null}
        <div className="community-post-title-row">
          <h2>{post.title}</h2>
          {responseCount > 0 ? <span className={`community-post-comment-count is-${countTone}`}>{responseCount}</span> : null}
        </div>
        <p className="community-post-excerpt">{excerpt}</p>
        <div className="community-post-meta">
          <span><i className="fa-solid fa-location-dot" aria-hidden="true" />{post.location}</span>
          {post.eventDate ? <span><i className="fa-regular fa-calendar" aria-hidden="true" />{post.eventDate}</span> : null}
          {post.responseCount != null ? (
            <span><i className="fa-regular fa-comment" aria-hidden="true" />{post.responseCount} {t("communityResponses")}</span>
          ) : post.timeAgo ? (
            <span><i className="fa-regular fa-clock" aria-hidden="true" />{post.timeAgo}</span>
          ) : null}
        </div>
        <CommunityPostActions postId={post.id} commentCount={responseCount} compact />
      </div>
      <i className="fa-solid fa-chevron-right community-post-chevron" aria-hidden="true" />
    </article>
  );
}
