import type { TranslationKey } from "@/components/LanguageProvider";

/** The dashboard's one navigation catalogue. The sidebar rail and the navbar
 *  popover both read from here, so a route cannot appear in one and not the
 *  other. `nearbyMap` is rail-only — it is a destination, not an account page. */
export type DashboardNavItem = {
  icon: string;
  translationKey: TranslationKey | null;
  label: string;
  suffix: string;
  railOnly?: boolean;
};

export const dashboardNavItems: readonly DashboardNavItem[] = [
  { icon: "ms-account-circle", translationKey: "myPage", label: "My page", suffix: "/my-page" },
  { icon: "ms-grid-view", translationKey: "dashboard", label: "Dashboard", suffix: "" },
  { icon: "ms-chat", translationKey: "messages", label: "Messages", suffix: "/messages" },
];

/** Jobs has no reservations or notification feed of its own. */
export function dashboardNavItemsFor(context: "market" | "jobs", { railOnly = false } = {}) {
  return dashboardNavItems.filter((item) => {
    if (item.railOnly && !railOnly) return false;
    return context !== "jobs" || item.label !== "Messages";
  });
}

/** Wishlist lives on the marketplace itself rather than inside the dashboard. */
export function dashboardNavHref(item: DashboardNavItem, context: "market" | "jobs") {
  if (item.label === "My page") return "/market/dashboard/my-page";
  if (item.label === "My page V2") return "/market/dashboard/my-page-v2";
  if (item.label === "Wishlist" && context === "market") return "/market/wishlist";
  return `/${context}/dashboard${item.suffix}`;
}
