"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { dashboardNavHref, dashboardNavItemsFor } from "@/components/dashboard/dashboard-nav-items";

const badgeLabel = (count: number) => (count > 99 ? "99+" : String(count));

/** The rail's links. This reads the active route from the URL rather than
 *  taking it as a prop, so the sidebar can live in the segment layout and
 *  survive navigation instead of being rebuilt by every page. */
export function DashboardNav({
  context,
  unreadMessageCount,
  unreadNotificationCount,
  isAdmin,
}: {
  context: "market" | "jobs";
  unreadMessageCount: number;
  unreadNotificationCount: number;
  isAdmin: boolean;
}) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const base = `/${context}/dashboard`;

  return (
    <nav className="dashboard-nav">
      {dashboardNavItemsFor(context, { railOnly: true }).map((item) => {
        const href = dashboardNavHref(item, context);
        // The index route would otherwise match every child path.
        const isActive = item.suffix === "" ? pathname === base : pathname.startsWith(href);
        const unreadCount = item.label === "Messages" ? unreadMessageCount : item.label === "Notifications" ? unreadNotificationCount : 0;

        return (
          <Link className={isActive ? "is-active" : ""} href={href} key={item.label}>
            <i className={`ti ${item.icon}`} aria-hidden="true" />
            <span>{item.translationKey ? t(item.translationKey) : item.label}</span>
            {unreadCount ? <b>{badgeLabel(unreadCount)}</b> : null}
          </Link>
        );
      })}
      {isAdmin ? (
        <Link className={pathname.startsWith("/admin") ? "is-active" : ""} href="/admin/listings">
          <i className="ti ti-shield-half" aria-hidden="true" />
          <span>Admin Centre</span>
        </Link>
      ) : null}
    </nav>
  );
}
