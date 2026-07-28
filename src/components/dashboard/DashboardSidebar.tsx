import Link from "next/link";
import { TranslatedText } from "@/components/LanguageProvider";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const items = [
  ["fa-border-all", "Dashboard", "dashboard", ""],
  ["fa-circle-user", "Profile Settings", "profileSettings", "/profile"],
  ["fa-bell", "Notifications", "notifications", "/notifications"],
  ["fa-message", "Messages", "messages", "/messages"],
  ["fa-heart", "Wishlist", "wishlist", "/wishlist"],
  ["fa-key", "Keywords", "keywords", "/keywords"],
  ["fa-rectangle-list", "Manage Listings", "manageListings", "/listings"],
  ["fa-map", "Nearby Map", "nearbyMap", "/map"],
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
  return (
    <aside className="market-filter-panel dashboard-sidebar" aria-label={`${context} dashboard navigation`}>
      <nav className="dashboard-nav">
        {items.filter(([, label]) => context === "market" || label !== "Notifications").map(([icon, label, translationKey, suffix]) => (
          <Link className={active === label ? "is-active" : ""} href={context === "market" && label === "Wishlist" ? "/market/wishlist" : `${base}${suffix}`} key={label}>
            <i className={`fa-solid ${icon}`} aria-hidden="true" /><span><TranslatedText translationKey={translationKey} /></span>{label === "Messages" && unreadMessageCount ? <b>{unreadBadge}</b> : label === "Notifications" && unreadNotificationCount ? <b>{notificationBadge}</b> : null}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
