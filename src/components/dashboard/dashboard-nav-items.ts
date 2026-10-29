import type { TranslationKey } from "@/components/LanguageProvider";

/** The dashboard's one navigation catalogue. The sidebar rail and the navbar
 *  popover both read from here, so a route cannot appear in one and not the
 *  other. */
export type DashboardNavItem = {
  icon: string;
  translationKey: TranslationKey | null;
  label: string;
  labelKo?: string;
  suffix: string;
  marketOnly?: boolean;
  jobsOnly?: boolean;
};

export const dashboardNavItems: readonly DashboardNavItem[] = [
  { icon: "ms-account-circle", translationKey: "myPage", label: "My Page", suffix: "/my-page" },
  { icon: "ms-bolt", translationKey: "tadaChargeGuide", label: "Tada Charge guide", suffix: "/tada-charge", marketOnly: true },
  { icon: "ms-grid-view", translationKey: "dashboard", label: "Dashboard", suffix: "", jobsOnly: true },
  { icon: "ms-account-circle", translationKey: "profileSettings", label: "Profile settings", suffix: "/profile" },
  { icon: "ms-notifications", translationKey: "notifications", label: "Notifications", suffix: "/notifications" },
  { icon: "ms-chat", translationKey: "messages", label: "Messages", suffix: "/messages" },
  { icon: "ms-favorite", translationKey: "wishlist", label: "Saved items", suffix: "/wishlist" },
  { icon: "ms-key", translationKey: "keywords", label: "Saved keywords", suffix: "/keywords" },
  { icon: "ms-list-alt", translationKey: "myItemsAndServices", label: "My items & services", suffix: "/listings" },
  { icon: "ms-event-available", translationKey: "reservationsAndPickups", label: "Reservations & pickups", suffix: "/reservations" },
];

/** Jobs has no reservations or notification feed of its own. */
export function dashboardNavItemsFor(context: "market" | "jobs") {
  return dashboardNavItems.filter((item) => {
    if (item.marketOnly && context !== "market") return false;
    if (item.jobsOnly && context !== "jobs") return false;
    if (context !== "jobs") return true;
    return item.suffix !== "/notifications" && item.suffix !== "/reservations";
  });
}

/** Wishlist lives on the marketplace itself rather than inside the dashboard. */
export function dashboardNavHref(item: DashboardNavItem, context: "market" | "jobs") {
  if (item.suffix === "/my-page") return "/market/dashboard/my-page";
  if (item.suffix === "/wishlist" && context === "market") return "/market/wishlist";
  return `/${context}/dashboard${item.suffix}`;
}
