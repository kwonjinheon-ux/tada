import Link from "next/link";

const items = [
  ["fa-chart-pie", "Overview", "/admin"],
  ["fa-rectangle-list", "All listings", "/admin/listings"],
  ["fa-users", "Members", "/admin/members"],
  ["fa-flag", "Reports", "/admin/moderation"],
] as const;

export function AdminSidebar({ active }: { active: "overview" | "listings" | "members" | "reports" }) {
  return <aside className="market-filter-panel dashboard-sidebar admin-sidebar" aria-label="Administrator navigation">
    <div className="admin-sidebar-heading"><i className="fa-solid fa-shield-halved" aria-hidden="true" /><span>Admin centre</span></div>
    <nav className="dashboard-nav">{items.map(([icon, label, href]) => <Link key={href} className={(active === "overview" && href === "/admin") || (active === "listings" && href.endsWith("listings")) || (active === "members" && href.endsWith("members")) || (active === "reports" && href.endsWith("moderation")) ? "is-active" : ""} href={href}><i className={`fa-solid ${icon}`} aria-hidden="true" /><span>{label}</span></Link>)}</nav>
  </aside>;
}
