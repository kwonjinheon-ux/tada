/**
 * The route serves three page types — a listing, a single bargain item and a
 * multi-item garage or moving sale — and cannot know which until the data
 * arrives. All three share the same frame though: the browse rail, a wide media
 * column and a card beside it, so the skeleton is built from that frame rather
 * than from any one of them. Matching it is the point: the previous skeleton
 * was a bare centred page with no rail, so the whole layout jumped sideways the
 * moment the real page replaced it.
 */
export default function ListingDetailLoading() {
  return (
    <div className="market-detail-shell listing-detail-loading-shell" aria-busy="true" aria-label="Loading listing">
      <aside className="listing-detail-loading-rail">
        {Array.from({ length: 9 }, (_, row) => <span key={row} />)}
      </aside>

      <div className="market-detail-shell-content">
        <main className="listing-detail-loading">
          <div className="listing-detail-loading-crumb" />
          <div className="listing-detail-loading-media" />
          <section className="listing-detail-loading-summary">
            <span /><strong /><b /><p /><div><i /><i /></div>
          </section>
          <section className="listing-detail-loading-description"><strong /><span /><span /><span /></section>
        </main>
      </div>
    </div>
  );
}
