/* Mirrors CommunityPostCard's DOM exactly — the .community-post-card-link
   wrapper (which carries the grid and the --community-thumb custom property),
   then a body of a title row and a meta row. Reusing the real classes means the
   placeholder inherits the real spacing, so rows do not shift when the content
   arrives. Most community posts have no image, so only some rows reserve a
   thumbnail; the rest use the same no-media modifier the real card uses. */
const skeletonRows = [
  { hasMedia: false, titleWidth: "68%" },
  { hasMedia: true, titleWidth: "54%" },
  { hasMedia: false, titleWidth: "78%" },
  { hasMedia: false, titleWidth: "46%" },
  { hasMedia: true, titleWidth: "62%" },
];

export function CommunityPostListSkeleton() {
  return (
    <div className="community-post-list community-post-list-skeleton" role="status" aria-label="Loading community posts">
      {skeletonRows.map(({ hasMedia, titleWidth }, index) => (
        <div className={`community-post-card community-post-card-skeleton ${hasMedia ? "" : "community-post-card-no-media"}`} key={index} aria-hidden="true">
          <div className="community-post-card-link">
            {hasMedia ? <span className="community-post-skeleton-media" /> : null}
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
