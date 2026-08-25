import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

const dashboardMenuItems = [
  ["ti-layout-grid", "dashboard", ""],
  ["ti-user-circle", "profileSettings", "/profile"],
  ["ti-bell", "notifications", "/notifications"],
  ["ti-message", "messages", "/messages"],
  ["ti-heart", "wishlist", "/wishlist"],
  ["ti-key", "keywords", "/keywords"],
  ["ti-list-details", "manageListings", "/listings"],
  ["ti-calendar-check", "reservations", "/reservations"],
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
  const { t } = useLanguage();
  const isMobile = variant === "mobile";
  const itemClassName = isMobile ? "mobile-profile-popover-item" : "desktop-dashboard-menu-item";
  const labelClassName = isMobile ? undefined : "desktop-dashboard-menu-label";
  const logoutClassName = isMobile ? "mobile-profile-popover-logout" : "desktop-dashboard-logout";

  const getHref = (translationKey: string, suffix: string) => (
    translationKey === "wishlist" && !isJobs ? "/market/wishlist" : `${dashboardBase}${suffix}`
  );

  return (
    <>
      {dashboardMenuItems.filter(([, translationKey]) => !isJobs || translationKey !== "reservations").map(([icon, translationKey, suffix]) => {
        const href = getHref(translationKey, suffix);
        const unreadCount = translationKey === "messages" ? unreadMessageCount : translationKey === "notifications" ? unreadNotificationCount : 0;

        return (
          <Link
            className={`${itemClassName} ${pathname === href ? "is-active" : ""}`}
            href={href}
            key={translationKey}
            onClick={onNavigate}
          >
            <i className={`ti ${icon}`} aria-hidden="true" />
            <span className={labelClassName}>{translationKey === "reservations" ? "Reservations" : t(translationKey)}</span>
            {unreadCount ? (
              <b>{badgeLabel(unreadCount)}</b>
            ) : !isMobile ? (
              <i className={`ti ti-chevron-right ${isMobile ? "" : "desktop-dashboard-chevron"}`} aria-hidden="true" />
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
          <i className="ti ti-shield-half" aria-hidden="true" />
          <span className={labelClassName}>{t("adminCentre")}</span>
          {!isMobile ? <i className="ti ti-chevron-right desktop-dashboard-chevron" aria-hidden="true" /> : null}
        </Link>
      ) : null}
      <button className={logoutClassName} type="button" onClick={onSignOut}>
        <i className="ti ti-logout" aria-hidden="true" /> {t("logOut")}
      </button>
    </>
  );
}
