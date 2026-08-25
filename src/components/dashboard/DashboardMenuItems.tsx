import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { dashboardNavHref, dashboardNavItemsFor } from "@/components/dashboard/dashboard-nav-items";

type DashboardMenuItemsProps = {
  variant: "mobile" | "desktop";
  pathname: string;
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
  isJobs,
  unreadMessageCount,
  unreadNotificationCount,
  isAdmin,
  onNavigate,
  onSignOut,
}: DashboardMenuItemsProps) {
  const { t } = useLanguage();
  const isMobile = variant === "mobile";
  const itemClassName = isMobile ? "mobile-profile-popover-item" : "desktop-dashboard-menu-item";
  const labelClassName = isMobile ? undefined : "desktop-dashboard-menu-label";
  const logoutClassName = isMobile ? "mobile-profile-popover-logout" : "desktop-dashboard-logout";

  const context = isJobs ? "jobs" : "market";

  return (
    <>
      {dashboardNavItemsFor(context).map((item) => {
        const { icon, translationKey, label } = item;
        const href = dashboardNavHref(item, context);
        const unreadCount = label === "Messages" ? unreadMessageCount : label === "Notifications" ? unreadNotificationCount : 0;

        return (
          <Link
            className={`${itemClassName} ${pathname === href ? "is-active" : ""}`}
            href={href}
            key={label}
            onClick={onNavigate}
          >
            <i className={`ms ${icon}`} aria-hidden="true" />
            <span className={labelClassName}>{translationKey ? t(translationKey) : label}</span>
            {unreadCount ? (
              <b>{badgeLabel(unreadCount)}</b>
            ) : !isMobile ? (
              <i className={`ms ms-chevron-right ${isMobile ? "" : "desktop-dashboard-chevron"}`} aria-hidden="true" />
            ) : null}
          </Link>
        );
      })}
      {isAdmin ? (
        <Link
          className={`${itemClassName} ${pathname.startsWith("/admin") ? "is-active" : ""}`}
          href="/admin"
          onClick={onNavigate}
        >
          <i className="ms ms-security" aria-hidden="true" />
          <span className={labelClassName}>{t("adminCentre")}</span>
          {!isMobile ? <i className="ms ms-chevron-right desktop-dashboard-chevron" aria-hidden="true" /> : null}
        </Link>
      ) : null}
      <button className={logoutClassName} type="button" onClick={onSignOut}>
        <i className="ms ms-logout" aria-hidden="true" /> {t("logOut")}
      </button>
    </>
  );
}
