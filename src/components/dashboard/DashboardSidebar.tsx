import Link from "next/link";
import { TranslatedText } from "@/components/LanguageProvider";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const items = [
  ["ti-layout-grid", "Dashboard", "dashboard", ""],
  ["ti-user-circle", "Profile Settings", "profileSettings", "/profile"],
  ["ti-bell", "Notifications", "notifications", "/notifications"],
  ["ti-message", "Messages", "messages", "/messages"],
  ["ti-heart", "Wishlist", "wishlist", "/wishlist"],
  ["ti-key", "Keywords", "keywords", "/keywords"],
  ["ti-list-details", "Manage Listings", "manageListings", "/listings"],
  ["ti-calendar-check", "Reservations", null, "/reservations"],
  ["ti-map", "Nearby Map", "nearbyMap", "/map"],
] as const;

export async function DashboardSidebar({ context = "market", active = "Dashboard" }: { context?: "market" | "jobs"; active?: string }) {
  const base = `/${context}/dashboard`;
  const user = await getServerUser();
  const supabase = await createServerSupabaseClient();
  const [{ count: unreadMessageCount }, { count: unreadNotificationCount }] = context === "market" && user && supabase
    ? await Promise.all([
      supabase.from("market_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
      supabase.from("market_notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    ])
    : [{ count: 0 }, { count: 0 }];
  const unreadBadge = (unreadMessageCount ?? 0) > 99 ? "99+" : String(unreadMessageCount ?? 0);
  const notificationBadge = (unreadNotificationCount ?? 0) > 99 ? "99+" : String(unreadNotificationCount ?? 0);
  const { data: role } = context === "market" && user && supabase
    ? await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const isAdmin = role?.role === "admin" || role?.role === "moderator";
  return (
    <aside className="market-filter-panel dashboard-sidebar" aria-label={`${context} dashboard navigation`}>
      <nav className="dashboard-nav">
        {items.filter(([, label]) => context === "market" || (label !== "Notifications" && label !== "Reservations")).map(([icon, label, translationKey, suffix]) => (
          <Link className={active === label ? "is-active" : ""} href={context === "market" && label === "Wishlist" ? "/market/wishlist" : `${base}${suffix}`} key={label}>
            <i className={`ti ${icon}`} aria-hidden="true" /><span>{translationKey ? <TranslatedText translationKey={translationKey} /> : label}</span>{label === "Messages" && unreadMessageCount ? <b>{unreadBadge}</b> : label === "Notifications" && unreadNotificationCount ? <b>{notificationBadge}</b> : null}
          </Link>
        ))}
        {isAdmin ? <Link className={active === "Admin Centre" ? "is-active" : ""} href="/admin/listings"><i className="ti ti-shield-half" aria-hidden="true" /><span>Admin Centre</span></Link> : null}
      </nav>
    </aside>
  );
}
