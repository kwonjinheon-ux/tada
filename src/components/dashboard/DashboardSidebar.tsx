import Link from "next/link";

const items = [
  ["fa-border-all", "Dashboard", ""],
  ["fa-circle-user", "Profile Settings", "/profile"],
  ["fa-message", "Messages", "/messages"],
  ["fa-heart", "Wishlist", "/wishlist"],
  ["fa-key", "Keywords", "/keywords"],
  ["fa-rectangle-list", "Manage Listings", "/listings"],
  ["fa-map", "Nearby Map", "/map"],
] as const;

export function DashboardSidebar({ context = "market", active = "Dashboard" }: { context?: "market" | "jobs"; active?: string }) {
  const base = `/${context}/dashboard`;
  return (
    <aside className="market-filter-panel dashboard-sidebar" aria-label={`${context} dashboard navigation`}>
      <nav className="dashboard-nav">
        {items.map(([icon, label, suffix]) => (
          <Link className={active === label ? "is-active" : ""} href={`${base}${suffix}`} key={label}>
            <i className={`fa-solid ${icon}`} aria-hidden="true" /><span>{label}</span>{label === "Messages" && <b>24</b>}
          </Link>
        ))}
      </nav>
      <Link className="dashboard-sell-button" href="/market/create"><i className="fa-solid fa-circle-plus" aria-hidden="true" /> Sell</Link>
    </aside>
  );
}
