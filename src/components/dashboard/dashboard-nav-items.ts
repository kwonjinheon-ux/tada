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
  { icon: "ms-grid-view", translationKey: "dashboard", label: "Dashboard", suffix: "" },
  { icon: "ms-account-circle", translationKey: "profileSettings", label: "Profile Settings", suffix: "/profile" },
  { icon: "ms-notifications", translationKey: "notifications", label: "Notifications", suffix: "/notifications" },
  { icon: "ms-chat", translationKey: "messages", label: "Messages", suffix: "/messages" },
  { icon: "ms-favorite", translationKey: "wishlist", label: "Wishlist", suffix: "/wishlist" },
  { icon: "ms-key", translationKey: "keywords", label: "Keywords", suffix: "/keywords" },
  { icon: "ms-list-alt", translationKey: "manageListings", label: "Manage Listings", suffix: "/listings" },
  { icon: "ms-event-available", translationKey: null, label: "Reservations", suffix: "/reservations" },
  { icon: "ms-map", translationKey: "nearbyMap", label: "Nearby Map", suffix: "/map", railOnly: true },
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
