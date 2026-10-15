import { CommunityPostListSkeleton } from "@/components/community/CommunityPostListSkeleton";
import { CommunityDesktopLayout } from "@/components/community/CommunityDesktopLayout";
import { PageContainer } from "@/components/layout/PageContainer";

/**
 * The shell a route paints while its server component is still fetching.
 *
 * Every browse and dashboard route is force-dynamic, so a navigation waits on
 * Supabase auth plus the page query before the first byte. Without a loading
 * boundary the router has nothing to show and the browser sits on the previous
 * page for that whole round trip, which reads as the app being slow to move.
 * A boundary also gives <Link> something to prefetch: for a dynamic route the
 * router prefetches the loading state, so the shell is already in cache by the
 * time the link is clicked.
 *
 * Each variant is built from the layout classes its own page uses — the same
 * grid, rail, intro and card containers — so the shell has the real geometry at
 * every breakpoint and the page does not jump when it arrives. Only the leaf
 * content is replaced with placeholders. One component with variants rather
 * than a skeleton per route: the shapes only differ in which shell they mirror.
 */
export function RouteSkeleton({ variant = "browse" }: { variant?: "browse" | "community" | "community-detail" | "services" | "service-detail" | "search" | "home" | "form" | "dashboard" }) {
  if (variant === "home") {
    return <main className="home-reference" aria-busy="true" aria-label="Loading home">
      <PageContainer className="home-reference-content">
        <section className="home-reference-hero" aria-hidden="true">
          <div className="home-reference-hero-copy route-skeleton-body"><div className="route-skeleton-heading" /><span className="route-skeleton-line" /><div className="route-skeleton-field" /></div>
          <div className="home-reference-hero-art route-skeleton-tile" />
        </section>
        <section className="home-reference-destinations" aria-hidden="true"><div className="home-reference-destination-grid">
          {[0, 1, 2].map((id) => <div key={id} className="home-reference-destination ui-card"><span className="route-skeleton-field" /><span className="route-skeleton-line" /></div>)}
        </div></section>
        <section className="home-reference-listing-section route-skeleton-body" aria-hidden="true">
          <div className="route-skeleton-heading" /><div className="home-reference-listing-grid">
            {Array.from({ length: 6 }, (_, id) => <div className="route-skeleton-card ui-card" key={id}><div className="route-skeleton-tile" /><span className="route-skeleton-line" /><span className="route-skeleton-line is-title" /></div>)}
          </div>
        </section>
      </PageContainer>
    </main>;
  }
  // The parent layout already renders the main landmark and dashboard rail.
  if (variant === "dashboard") {
    return <div className="dashboard-content route-skeleton-body" role="status" aria-label="Loading dashboard" aria-busy="true">
      <div className="route-skeleton-heading" />
      <div className="route-skeleton-rows" aria-hidden="true">
        {Array.from({ length: 6 }, (_, row) => <div className="route-skeleton-card ui-panel" key={row}><span className="route-skeleton-line is-title" /><span className="route-skeleton-line" /></div>)}
      </div>
    </div>;
  }
  if (variant === "form") {
    return <main className="route-skeleton route-skeleton--form" aria-busy="true" aria-label="Loading">
      <div className="route-skeleton-heading" />
      {[0, 1, 2].map((section) => <section key={section} className="route-skeleton-card ui-panel">
        <span className="route-skeleton-line is-title" />
        <span className="route-skeleton-line" />
        <span className="route-skeleton-field" />
        <span className="route-skeleton-field" />
      </section>)}
    </main>;
  }

  if (variant === "community-detail") {
    return <CommunityDesktopLayout activeCategory="all">
      <div className="listing-detail-page community-detail-page community-detail-container community-detail-loading" aria-busy="true" aria-label="Loading community post">
        <nav className="detail-breadcrumb" aria-hidden="true"><span className="route-skeleton-line" /><i className="route-skeleton-chevron" /><span className="route-skeleton-line" /></nav>
        <article className="ui-card community-detail-post" aria-hidden="true">
          <header className="community-detail-post-header">
            <div className="community-detail-post-heading">
              <div className="community-detail-title-row"><span className="route-skeleton-line is-title" /></div>
              <div className="community-detail-post-meta"><span className="route-skeleton-line" /><span className="route-skeleton-line" /><span className="route-skeleton-line" /></div>
            </div>
            <div className="community-detail-author"><span className="route-skeleton-author" /><span className="route-skeleton-line" /></div>
          </header>
          <div className="listing-detail-gallery shared-image-gallery community-detail-gallery"><div className="listing-detail-main-image route-skeleton-tile" /></div>
          <div className="community-detail-body community-detail-loading-body"><span className="route-skeleton-line" /><span className="route-skeleton-line" /><span className="route-skeleton-line" /></div>
          <footer className="community-detail-post-footer"><div className="community-detail-post-actions"><span className="route-skeleton-field" /><span className="route-skeleton-field" /><span className="route-skeleton-field" /><span className="route-skeleton-field" /></div></footer>
        </article>
        <section className="listing-comments is-community community-detail-loading-comments" aria-hidden="true"><div className="listing-comments-heading"><span className="route-skeleton-line is-title" /><span className="route-skeleton-line" /></div><div className="listing-comments-composer"><span className="route-skeleton-field" /></div></section>
      </div>
    </CommunityDesktopLayout>;
  }

  // Search has no rail: it is a single reading column of result sections.
  if (variant === "search") {
    return <main className="global-search-page" aria-busy="true" aria-label="Loading search results">
      <PageContainer>
        <div className="global-search-results" aria-hidden="true">
          <div className="route-skeleton-heading" />
          <section className="global-search-section">
            <div className="global-search-section-heading"><span className="route-skeleton-line is-title" /></div>
            <div className="product-grid is-list-view global-search-market-list">
              {Array.from({ length: 4 }, (_, card) => <article className="route-skeleton-card ui-card" key={card}><div className="route-skeleton-tile" /><span className="route-skeleton-line is-title" /><span className="route-skeleton-line" /></article>)}
            </div>
          </section>
          <section className="global-search-section">
            <div className="global-search-section-heading"><span className="route-skeleton-line is-title" /></div>
            <CommunityPostListSkeleton />
          </section>
        </div>
      </PageContainer>
    </main>;
  }

  if (variant === "community") {
    return <main className="marketplace-page community-page" aria-busy="true" aria-label="Loading community posts">
      <BrowseRailSkeleton />
      <section className="market-results community-results">
        <BrowseIntroSkeleton />
        <MobileRailSkeleton cells={8} className="community-mobile-category-rail" />
        <BrowseToolbarSkeleton chips={4} />
        <CommunityPostListSkeleton />
        <div className="community-list-footer" aria-hidden="true"><span className="route-skeleton-field route-skeleton-search" /></div>
      </section>
      <aside className="community-recent-panel" aria-hidden="true">
        <div className="route-skeleton-rows">
          <span className="route-skeleton-line is-title" />
          {Array.from({ length: 5 }, (_, row) => <span className="route-skeleton-line" key={row} />)}
        </div>
      </aside>
    </main>;
  }

  // One provider: the browse rail stays, and the results column carries the
  // page back link and the hero card rather than a list.
  if (variant === "service-detail") {
    return <main className="marketplace-page services-page service-profile-page" aria-busy="true" aria-label="Loading service">
      <BrowseRailSkeleton className="services-filter-rail service-profile-filter-rail" />
      <section className="market-results services-results service-profile-main">
        <div className="service-profile-shell" aria-hidden="true">
          <span className="route-skeleton-line" />
          <section className="service-profile-hero ui-card">
            <div className="service-profile-media route-skeleton-tile" />
            <div className="service-profile-hero-copy">
              <span className="route-skeleton-line" />
              <span className="route-skeleton-heading" />
              <span className="route-skeleton-line" />
              <span className="route-skeleton-field route-skeleton-cta" />
            </div>
          </section>
        </div>
      </section>
    </main>;
  }

  if (variant === "services") {
    return <main className="marketplace-page services-page" aria-busy="true" aria-label="Loading services">
      <BrowseRailSkeleton />
      <section className="market-results services-results">
        <BrowseIntroSkeleton />
        <MobileRailSkeleton cells={12} className="services-mobile-category-rail" />
        <div className="services-category-grid" aria-hidden="true">
          {Array.from({ length: 12 }, (_, tile) => <div className="services-category" key={tile}><span className="route-skeleton-field route-skeleton-glyph" /><span className="route-skeleton-line" /></div>)}
        </div>
        <BrowseToolbarSkeleton chips={2} />
        <section className="services-sponsor-banner" aria-hidden="true">
          <div className="services-sponsor-copy"><span className="route-skeleton-line" /><span className="route-skeleton-line is-title" /><span className="route-skeleton-line" /></div>
          <ul><li><span className="route-skeleton-line" /></li><li><span className="route-skeleton-line" /></li><li><span className="route-skeleton-line" /></li></ul>
          <span className="route-skeleton-tile" />
          <span className="route-skeleton-field route-skeleton-toggle" />
        </section>
        <div className="services-card-grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, card) => <article className="route-skeleton-card ui-card" key={card}><div className="route-skeleton-tile" /><span className="route-skeleton-line is-title" /><span className="route-skeleton-line" /></article>)}
        </div>
      </section>
      <aside className="services-side-rail" aria-hidden="true">
        <div className="route-skeleton-rows">
          <span className="route-skeleton-line is-title" />
          {Array.from({ length: 4 }, (_, row) => <span className="route-skeleton-line" key={row} />)}
        </div>
      </aside>
    </main>;
  }

  return <main className="marketplace-page market-page-with-bottom-dock" aria-busy="true" aria-label="Loading listings">
    <BrowseRailSkeleton />
    <section className="market-results">
      <BrowseIntroSkeleton />
      <MobileRailSkeleton cells={6} className="" />
      <BrowseToolbarSkeleton chips={4} />
      <div className="product-grid" aria-hidden="true">
        {Array.from({ length: 8 }, (_, card) => <article className="route-skeleton-card ui-card" key={card}>
          <div className="route-skeleton-tile" />
          <span className="route-skeleton-line is-title" />
          <span className="route-skeleton-line" />
          <span className="route-skeleton-line is-title" />
        </article>)}
      </div>
    </section>
  </main>;
}

/** The rail every browse surface opens with: the two location selects, then
 *  the filter menu. It hides itself below 768px exactly as the real one does. */
function BrowseRailSkeleton({ className = "" }: { className?: string } = {}) {
  return <aside className={`market-filter-panel ${className}`.trim()} aria-hidden="true">
    <div className="browse-filter-sidebar">
      <div className="browse-filter-sidebar-location">
        <section className="filter-block location-block">
          <span className="route-skeleton-line is-title" />
          <span className="route-skeleton-field" />
          <span className="route-skeleton-field" />
        </section>
      </div>
      <div className="browse-filter-sidebar-menu">
        {[5, 8].map((rows, block) => <section className="filter-block" key={block}>
          <span className="route-skeleton-line is-title" />
          {Array.from({ length: rows }, (_, row) => <span className="route-skeleton-field" key={row} />)}
        </section>)}
      </div>
    </div>
  </aside>;
}

/** The swipeable category rail phones get above the toolbar. */
function MobileRailSkeleton({ cells, className }: { cells: number; className: string }) {
  return <section className={`mobile-browse-category-section ${className}`} aria-hidden="true">
    <div className="mobile-browse-category-rail">
      {Array.from({ length: cells }, (_, cell) => <span className="mobile-browse-category" key={cell}>
        <span className="mobile-browse-category-icon"><span className="route-skeleton-glyph" /></span>
        <span className="route-skeleton-line" />
      </span>)}
    </div>
  </section>;
}

/** The heading, its one line of copy, and the create button beside them. */
function BrowseIntroSkeleton() {
  return <div className="browse-intro browse-intro--with-create" aria-hidden="true">
    <div className="browse-intro-copy">
      <span className="route-skeleton-heading" />
      <span className="route-skeleton-line" />
    </div>
    <span className="route-skeleton-field route-skeleton-cta" />
  </div>;
}

/** View toggle on the left, filter chips beside it. */
function BrowseToolbarSkeleton({ chips }: { chips: number }) {
  return <div className="market-toolbar" aria-hidden="true">
    <div className="market-toolbar-top">
      <span className="route-skeleton-field route-skeleton-toggle" />
      <div className="market-chip-row">
        {Array.from({ length: chips }, (_, chip) => <span className="route-skeleton-field route-skeleton-chip" key={chip} />)}
      </div>
    </div>
  </div>;
}
