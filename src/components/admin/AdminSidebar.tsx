import Link from "next/link";

const items = [
  ["ti-chart-pie", "Overview", "/admin"],
  ["ti-list-details", "All listings", "/admin/listings"],
  ["ti-users", "Members", "/admin/members"],
  ["ti-flag", "Reports", "/admin/moderation"],
  ["ti-ad", "Advertising", "/admin/advertising"],
] as const;

export function AdminSidebar({ active }: { active: "overview" | "listings" | "members" | "reports" | "advertising" }) {
  return <aside className="market-filter-panel dashboard-sidebar admin-sidebar" aria-label="Administrator navigation">
    <div className="admin-sidebar-heading"><i className="ti ti-shield-half" aria-hidden="true" /><div><span>Admin centre</span><small>Operations workspace</small></div></div>
    <nav className="dashboard-nav">{items.map(([icon, label, href]) => <Link key={href} className={(active === "overview" && href === "/admin") || (active === "listings" && href.endsWith("listings")) || (active === "members" && href.endsWith("members")) || (active === "reports" && href.endsWith("moderation")) || (active === "advertising" && href.endsWith("advertising")) ? "is-active" : ""} href={href}><i className={`ti ${icon}`} aria-hidden="true" /><span>{label}</span></Link>)}</nav>
  </aside>;
}
