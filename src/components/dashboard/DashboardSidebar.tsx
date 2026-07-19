import Link from "next/link";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const items = [
  ["fa-border-all", "Dashboard", ""],
  ["fa-circle-user", "Profile Settings", "/profile"],
  ["fa-message", "Messages", "/messages"],
  ["fa-heart", "Wishlist", "/wishlist"],
  ["fa-key", "Keywords", "/keywords"],
  ["fa-rectangle-list", "Manage Listings", "/listings"],
  ["fa-map", "Nearby Map", "/map"],
] as const;

export async function DashboardSidebar({ context = "market", active = "Dashboard" }: { context?: "market" | "jobs"; active?: string }) {
  const base = `/${context}/dashboard`;
  const user = await getServerUser();
  const supabase = await createServerSupabaseClient();
  const { count: unreadMessageCount } = context === "market" && user && supabase
    ? await supabase.from("market_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null)
    : { count: 0 };
  const unreadBadge = (unreadMessageCount ?? 0) > 99 ? "99+" : String(unreadMessageCount ?? 0);
  return (
    <aside className="market-filter-panel dashboard-sidebar" aria-label={`${context} dashboard navigation`}>
      <nav className="dashboard-nav">
        {items.map(([icon, label, suffix]) => (
          <Link className={active === label ? "is-active" : ""} href={`${base}${suffix}`} key={label}>
            <i className={`fa-solid ${icon}`} aria-hidden="true" /><span>{label}</span>{label === "Messages" && unreadMessageCount ? <b>{unreadBadge}</b> : null}
          </Link>
        ))}
      </nav>
      <Link className="dashboard-sell-button" href="/market/create"><i className="fa-solid fa-circle-plus" aria-hidden="true" /> Sell</Link>
    </aside>
  );
}
