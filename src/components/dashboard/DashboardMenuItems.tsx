import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

const dashboardMenuItems = [
  ["fa-border-all", "dashboard", ""],
  ["fa-circle-user", "profileSettings", "/profile"],
  ["fa-bell", "notifications", "/notifications"],
  ["fa-message", "messages", "/messages"],
  ["fa-heart", "wishlist", "/wishlist"],
  ["fa-key", "keywords", "/keywords"],
  ["fa-rectangle-list", "manageListings", "/listings"],
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
      {dashboardMenuItems.map(([icon, translationKey, suffix]) => {
        const href = getHref(translationKey, suffix);
        const unreadCount = translationKey === "messages" ? unreadMessageCount : translationKey === "notifications" ? unreadNotificationCount : 0;

        return (
          <Link
            className={`${itemClassName} ${pathname === href ? "is-active" : ""}`}
            href={href}
            key={translationKey}
            onClick={onNavigate}
          >
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
            <span className={labelClassName}>{t(translationKey)}</span>
            {unreadCount ? (
              <b>{badgeLabel(unreadCount)}</b>
            ) : !isMobile ? (
              <i className={`fa-solid fa-chevron-right ${isMobile ? "" : "desktop-dashboard-chevron"}`} aria-hidden="true" />
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
          <i className="fa-solid fa-shield-halved" aria-hidden="true" />
          <span className={labelClassName}>{t("adminCentre")}</span>
          {!isMobile ? <i className="fa-solid fa-chevron-right desktop-dashboard-chevron" aria-hidden="true" /> : null}
        </Link>
      ) : null}
      <button className={logoutClassName} type="button" onClick={onSignOut}>
        <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> {t("logOut")}
      </button>
    </>
  );
}
