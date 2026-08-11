import { communityPostTypes, type CommunityPost } from "@/data/community-posts";

export function CommunityRecentPostsPanel({ posts }: { posts: CommunityPost[] }) {
  return (
    <aside className="community-recent-panel" aria-label="Recent posts">
      <div className="community-recent-panel-heading">
        <h2>Recent Posts</h2>
      </div>
      <div className="community-recent-panel-list">
        {posts.map((post) => (
          <article className="community-recent-post" key={post.id}>
            <div className="community-recent-post-body">
              <span className="community-recent-post-meta">{communityPostTypes[post.type].label} · {post.timeAgo ?? post.eventDate ?? "New"}</span>
              <h3>{post.title}</h3>
              <span className="community-recent-post-stats">{post.responseCount != null ? `${post.responseCount} responses` : "No responses yet"}</span>
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
