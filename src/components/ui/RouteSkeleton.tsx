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
export function RouteSkeleton({ variant = "browse" }: { variant?: "browse" | "form" | "dashboard" }) {
  if (variant === "form") {
    return <main className="route-skeleton route-skeleton--form" aria-busy="true" aria-label="Loading">
      <div className="route-skeleton-heading" />
      {[0, 1, 2].map((section) => <section key={section} className="route-skeleton-card">
        <span className="route-skeleton-line is-title" />
        <span className="route-skeleton-line" />
        <span className="route-skeleton-field" />
        <span className="route-skeleton-field" />
      </section>)}
    </main>;
  }

  const isDashboard = variant === "dashboard";

  return <main className={`route-skeleton route-skeleton--${variant}`} aria-busy="true" aria-label="Loading">
    <aside className="route-skeleton-rail">
      {Array.from({ length: 7 }, (_, row) => <span key={row} className="route-skeleton-line" />)}
    </aside>
    <section className="route-skeleton-body">
      <div className="route-skeleton-toolbar">
        <span className="route-skeleton-line is-title" />
        <span className="route-skeleton-line" />
      </div>
      <div className={isDashboard ? "route-skeleton-rows" : "route-skeleton-grid"}>
        {Array.from({ length: isDashboard ? 6 : 8 }, (_, cell) => <article key={cell} className="route-skeleton-tile" />)}
      </div>
    </section>
  </main>;
}
