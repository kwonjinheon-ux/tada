import { communityPostTypes, type CommunityPost } from "@/data/community-posts";

export function CommunityPostCard({ post }: { post: CommunityPost }) {
  const typeInfo = communityPostTypes[post.type];

  return (
    <article className={`community-post-card community-post-card-${post.type}`}>
      <div className="community-post-media">
        {post.image ? <img src={post.image} alt={post.imageAlt ?? ""} /> : <span className="community-post-placeholder">txt</span>}
      </div>
      <div className="community-post-body">
        <span className={`community-post-badge community-post-badge-${post.type}`}>{typeInfo.label}</span>
        <h2>{post.title}</h2>
        <p className="community-post-excerpt">{post.excerpt}</p>
        <div className="community-post-meta">
          <span><i className="fa-solid fa-location-dot" aria-hidden="true" />{post.location}</span>
          {post.eventDate ? <span><i className="fa-regular fa-calendar" aria-hidden="true" />{post.eventDate}</span> : null}
          {post.responseCount != null ? (
            <span><i className="fa-regular fa-comment" aria-hidden="true" />{post.responseCount} responses</span>
          ) : post.timeAgo ? (
            <span><i className="fa-regular fa-clock" aria-hidden="true" />{post.timeAgo}</span>
          ) : null}
        </div>
      </div>
      <i className="fa-solid fa-chevron-right community-post-chevron" aria-hidden="true" />
    </article>
  );
}
