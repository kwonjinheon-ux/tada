import Link from "next/link";

const items = [
  ["ms-pie-chart", "Overview", "/admin"],
  ["ms-list-alt", "All listings", "/admin/listings"],
  ["ms-group", "Members", "/admin/members"],
  ["ms-flag", "Reports", "/admin/moderation"],
  ["ms-ad", "Advertising", "/admin/advertising"],
] as const;

export function AdminSidebar({ active }: { active: "overview" | "listings" | "members" | "reports" | "advertising" }) {
  return <aside className="market-filter-panel dashboard-sidebar admin-sidebar" aria-label="Administrator navigation">
    <div className="admin-sidebar-heading"><i className="ms ms-security" aria-hidden="true" /><div><span>Admin centre</span><small>Operations workspace</small></div></div>
    <nav className="dashboard-nav">{items.map(([icon, label, href]) => <Link key={href} className={(active === "overview" && href === "/admin") || (active === "listings" && href.endsWith("listings")) || (active === "members" && href.endsWith("members")) || (active === "reports" && href.endsWith("moderation")) || (active === "advertising" && href.endsWith("advertising")) ? "is-active" : ""} href={href}><i className={`ms ${icon}`} aria-hidden="true" /><span>{label}</span></Link>)}</nav>
  </aside>;
}
