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
  { icon: "ti-layout-grid", translationKey: "dashboard", label: "Dashboard", suffix: "" },
  { icon: "ti-user-circle", translationKey: "profileSettings", label: "Profile Settings", suffix: "/profile" },
  { icon: "ti-bell", translationKey: "notifications", label: "Notifications", suffix: "/notifications" },
  { icon: "ti-message", translationKey: "messages", label: "Messages", suffix: "/messages" },
  { icon: "ti-heart", translationKey: "wishlist", label: "Wishlist", suffix: "/wishlist" },
  { icon: "ti-key", translationKey: "keywords", label: "Keywords", suffix: "/keywords" },
  { icon: "ti-list-details", translationKey: "manageListings", label: "Manage Listings", suffix: "/listings" },
  { icon: "ti-calendar-check", translationKey: null, label: "Reservations", suffix: "/reservations" },
  { icon: "ti-map", translationKey: "nearbyMap", label: "Nearby Map", suffix: "/map", railOnly: true },
];

/** Jobs has no reservations or notification feed of its own. */
export function dashboardNavItemsFor(context: "market" | "jobs", { railOnly = false } = {}) {
  return dashboardNavItems.filter((item) => {
    if (item.railOnly && !railOnly) return false;
    if (context !== "jobs") return true;
    return item.label !== "Notifications" && item.label !== "Reservations";
  });
}

/** Wishlist lives on the marketplace itself rather than inside the dashboard. */
export function dashboardNavHref(item: DashboardNavItem, context: "market" | "jobs") {
  if (item.label === "Wishlist" && context === "market") return "/market/wishlist";
  return `/${context}/dashboard${item.suffix}`;
}
