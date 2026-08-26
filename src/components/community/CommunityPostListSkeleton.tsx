/* Mirrors CommunityPostCard's left media-or-document-icon column and the
   text body so loading rows retain the final list geometry. */
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
        <div className="community-post-card community-post-card-skeleton" key={index} aria-hidden="true">
          <div className="community-post-card-link">
            <span className={`community-post-skeleton-media ${hasMedia ? "" : "is-text"}`} />
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
