import Link from "next/link";

const dashboardMenuItems = [
  ["fa-border-all", "Dashboard", ""],
  ["fa-circle-user", "Profile Settings", "/profile"],
  ["fa-bell", "Notifications", "/notifications"],
  ["fa-message", "Messages", "/messages"],
  ["fa-heart", "Wishlist", "/wishlist"],
  ["fa-key", "Keywords", "/keywords"],
  ["fa-rectangle-list", "Manage Listings", "/listings"],
] as const;

type DashboardMenuItemsProps = {
  variant: "mobile" | "desktop";
  pathname: string;
  dashboardBase: string;
  isJobs: boolean;
  unreadMessageCount: number;
  unreadNotificationCount: number;
  isAdmin: boolean;
  onNavigate: () => void;
  onSignOut: () => void;
};

const badgeLabel = (count: number) => (count > 99 ? "99+" : String(count));

export function DashboardMenuItems({
  variant,
  pathname,
  dashboardBase,
  isJobs,
  unreadMessageCount,
  unreadNotificationCount,
  isAdmin,
  onNavigate,
  onSignOut,
}: DashboardMenuItemsProps) {
  const isMobile = variant === "mobile";
  const itemClassName = isMobile ? "mobile-profile-popover-item" : "desktop-dashboard-menu-item";
  const labelClassName = isMobile ? undefined : "desktop-dashboard-menu-label";
  const logoutClassName = isMobile ? "mobile-profile-popover-logout" : "desktop-dashboard-logout";

  const getHref = (label: string, suffix: string) => (
    label === "Wishlist" && !isJobs ? "/market/wishlist" : `${dashboardBase}${suffix}`
  );

  return (
    <>
      {dashboardMenuItems.map(([icon, label, suffix]) => {
        const href = getHref(label, suffix);
        const unreadCount = label === "Messages" ? unreadMessageCount : label === "Notifications" ? unreadNotificationCount : 0;

        return (
          <Link
            className={`${itemClassName} ${pathname === href ? "is-active" : ""}`}
            href={href}
            key={label}
            onClick={onNavigate}
          >
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
            <span className={labelClassName}>{label}</span>
            {unreadCount ? (
              <b>{badgeLabel(unreadCount)}</b>
            ) : (
              <i className={`fa-solid fa-chevron-right ${isMobile ? "" : "desktop-dashboard-chevron"}`} aria-hidden="true" />
            )}
          </Link>
        );
      })}
      {isAdmin ? (
        <Link
          className={`${itemClassName} ${pathname.startsWith("/admin") ? "is-active" : ""}`}
          href="/admin"
          onClick={onNavigate}
        >
          <i className="fa-solid fa-shield-halved" aria-hidden="true" />
          <span className={labelClassName}>Admin centre</span>
          <i className={`fa-solid fa-chevron-right ${isMobile ? "" : "desktop-dashboard-chevron"}`} aria-hidden="true" />
        </Link>
      ) : null}
      <button className={logoutClassName} type="button" onClick={onSignOut}>
        <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Log out
      </button>
    </>
  );
}
