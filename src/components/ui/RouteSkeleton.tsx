import { CommunityPostListSkeleton } from "@/components/community/CommunityPostListSkeleton";
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
 * One component with variants rather than a skeleton per route — the shapes
 * only differ in which shell they mirror.
 */
export function RouteSkeleton({ variant = "browse" }: { variant?: "browse" | "community" | "services" | "home" | "form" | "dashboard" }) {
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

  return <main className={`marketplace-page route-skeleton route-skeleton--browse route-skeleton--${variant}`} aria-busy="true" aria-label="Loading">
    <aside className="route-skeleton-rail">
      {Array.from({ length: 7 }, (_, row) => <span key={row} className="route-skeleton-line" />)}
    </aside>
    <section className="route-skeleton-body">
      <div className="route-skeleton-toolbar">
        <span className="route-skeleton-line is-title" />
        <span className="route-skeleton-line" />
      </div>
      {variant === "community" ? <CommunityPostListSkeleton /> : <div className={variant === "services" ? "services-card-grid" : "product-grid"} aria-hidden="true">
        {Array.from({ length: 8 }, (_, cell) => <article key={cell} className="route-skeleton-card ui-card">
          <div className="route-skeleton-tile" />
          <span className="route-skeleton-line is-title" />
          <span className="route-skeleton-line" />
          <span className="route-skeleton-line is-title" />
        </article>)}
      </div>}
    </section>
  </main>;
}
