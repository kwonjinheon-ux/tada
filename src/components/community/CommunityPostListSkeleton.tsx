export function CommunityPostListSkeleton() {
  return (
    <div className="community-post-list community-post-list-skeleton" role="status" aria-label="Loading community posts">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="community-post-card community-post-card-skeleton" key={index} aria-hidden="true">
          <span className="community-post-skeleton-media" />
          <span className="community-post-skeleton-body"><i /><i /><i /></span>
        </div>
      ))}
    </div>
  );
}
