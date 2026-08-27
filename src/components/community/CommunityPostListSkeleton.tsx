/* Mirrors CommunityPostCard's left media column and text body so loading rows
   retain the final list geometry. The media bar is one shape for every row:
   posts with photos and posts without now share the same square thumbnail. */
const skeletonTitleWidths = ["68%", "54%", "78%", "46%", "62%"];

export function CommunityPostListSkeleton() {
  return (
    <div className="community-post-list community-post-list-skeleton" role="status" aria-label="Loading community posts">
      {skeletonTitleWidths.map((titleWidth, index) => (
        <div className="community-post-card community-post-card-skeleton" key={index} aria-hidden="true">
          <div className="community-post-card-link">
            <span className="community-post-skeleton-media" />
            <div className="community-post-body">
              <div className="community-post-title-row">
                <i className="community-post-skeleton-title" style={{ width: titleWidth }} />
              </div>
              <div className="community-post-meta community-post-skeleton-meta">
                <i /><i /><i /><i />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
