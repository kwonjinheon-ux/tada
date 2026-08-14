import { PageContainer } from "@/components/layout/PageContainer";

/* Without this the route is a plain server component, so tapping a post left
   the previous screen frozen until every query resolved. Next renders this
   instantly on navigation and swaps in the real page when it is ready.
   It reuses the detail page's own wrapper classes so the shell it paints —
   container width, card, header block, meta row — lands in the same place the
   real content will, and only the text itself pops in. */
export default function CommunityPostLoading() {
  return (
    <main className="listing-detail-page community-detail-page" aria-busy="true">
      <PageContainer className="community-detail-container">
        <div className="community-detail-breadcrumb community-detail-skeleton-breadcrumb" aria-hidden="true">
          <i /><i />
        </div>
        <article className="ui-card community-detail-post community-detail-post-skeleton" aria-hidden="true">
          <header className="community-detail-post-header">
            <div className="community-detail-post-heading">
              <div className="community-detail-title-row"><i className="community-detail-skeleton-title" /></div>
              <div className="community-detail-post-meta community-detail-skeleton-meta"><i /><i /><i /></div>
            </div>
          </header>
          <div className="community-detail-skeleton-body"><i /><i /><i /><i /></div>
        </article>
      </PageContainer>
    </main>
  );
}
