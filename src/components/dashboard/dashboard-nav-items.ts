import type { TranslationKey } from "@/components/LanguageProvider";

/** The dashboard's one navigation catalogue. The sidebar rail and the navbar
 *  popover both read from here, so a route cannot appear in one and not the
 *  other. `nearbyMap` is rail-only — it is a destination, not an account page. */
export type DashboardNavItem = {
  icon: string;
  translationKey: TranslationKey | null;
  label: string;
  labelKo?: string;
  suffix: string;
  railOnly?: boolean;
  marketOnly?: boolean;
};

export const dashboardNavItems: readonly DashboardNavItem[] = [
  { icon: "ms-account-circle", translationKey: "myPage", label: "My Page", suffix: "/my-page" },
  { icon: "ms-bolt", translationKey: "tadaChargeGuide", label: "Tada Charge guide", suffix: "/tada-charge", marketOnly: true },
  { icon: "ms-bolt", translationKey: null, label: "Tada Charge guide V2", labelKo: "타다 충전이란 V2", suffix: "/tada-charge-v2", marketOnly: true },
  { icon: "ms-layers", translationKey: "myPageV2", label: "My Page V2", suffix: "/my-page-v2" },
  { icon: "ms-account-circle", translationKey: "profileSettings", label: "Profile settings", suffix: "/profile" },
  { icon: "ms-notifications", translationKey: "notifications", label: "Notifications", suffix: "/notifications" },
  { icon: "ms-chat", translationKey: "messages", label: "Messages", suffix: "/messages" },
  { icon: "ms-favorite", translationKey: "wishlist", label: "Saved items", suffix: "/wishlist" },
  { icon: "ms-key", translationKey: "keywords", label: "Saved keywords", suffix: "/keywords" },
  { icon: "ms-list-alt", translationKey: "myItemsAndServices", label: "My items & services", suffix: "/listings" },
  { icon: "ms-event-available", translationKey: "reservationsAndPickups", label: "Reservations & pickups", suffix: "/reservations" },
  { icon: "ms-map", translationKey: "nearbyMap", label: "Nearby Map", suffix: "/map", railOnly: true },
];

/** Jobs has no reservations or notification feed of its own. */
export function dashboardNavItemsFor(context: "market" | "jobs", { railOnly = false } = {}) {
  return dashboardNavItems.filter((item) => {
    if (item.railOnly && !railOnly) return false;
    if (item.marketOnly && context !== "market") return false;
    if (context !== "jobs") return true;
    return item.suffix !== "/notifications" && item.suffix !== "/reservations";
  });
}

/** Wishlist lives on the marketplace itself rather than inside the dashboard. */
export function dashboardNavHref(item: DashboardNavItem, context: "market" | "jobs") {
  if (item.suffix === "/my-page") return "/market/dashboard/my-page";
  if (item.suffix === "/my-page-v2") return "/market/dashboard/my-page-v2";
  if (item.suffix === "/wishlist" && context === "market") return "/market/wishlist";
  return `/${context}/dashboard${item.suffix}`;
}
