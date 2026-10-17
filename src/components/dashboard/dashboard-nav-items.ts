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
  { icon: "ms-account-circle", translationKey: "myPage", label: "My page", suffix: "/my-page" },
  { icon: "ms-bolt", translationKey: "tadaChargeGuide", label: "Tada Charge guide", suffix: "/tada-charge", marketOnly: true },
  { icon: "ms-bolt", translationKey: null, label: "Tada Charge guide V2", labelKo: "타다 충전이란 V2", suffix: "/tada-charge-v2", marketOnly: true },
  { icon: "ms-layers", translationKey: "myPageV2", label: "My page V2", suffix: "/my-page-v2" },
  { icon: "ms-grid-view", translationKey: "dashboard", label: "Dashboard", suffix: "" },
  { icon: "ms-account-circle", translationKey: "profileSettings", label: "Profile Settings", suffix: "/profile" },
  { icon: "ms-notifications", translationKey: "notifications", label: "Notifications", suffix: "/notifications" },
  { icon: "ms-notifications", translationKey: null, label: "Notifications V0", labelKo: "알림 V0", suffix: "/notifications-v0", marketOnly: true },
  { icon: "ms-chat", translationKey: "messages", label: "Messages", suffix: "/messages" },
  { icon: "ms-chat", translationKey: null, label: "Messages V0", labelKo: "메시지 V0", suffix: "/messages-v0", marketOnly: true },
  { icon: "ms-favorite", translationKey: "wishlist", label: "Wishlist", suffix: "/wishlist" },
  { icon: "ms-favorite", translationKey: null, label: "Wishlist V0", labelKo: "찜 목록 V0", suffix: "/wishlist-v0", marketOnly: true },
  { icon: "ms-key", translationKey: "keywords", label: "Keywords", suffix: "/keywords" },
  { icon: "ms-key", translationKey: null, label: "Keywords V0", labelKo: "키워드 V0", suffix: "/keywords-v0", marketOnly: true },
  { icon: "ms-list-alt", translationKey: null, label: "My items & services", labelKo: "내 상품·서비스", suffix: "/listings" },
  { icon: "ms-list-alt", translationKey: null, label: "Manage Listings V0", labelKo: "내 등록 관리 V0", suffix: "/listings-v0", marketOnly: true },
  { icon: "ms-event-available", translationKey: null, label: "Reservations", suffix: "/reservations" },
  { icon: "ms-event-available", translationKey: null, label: "Reservations V0", labelKo: "예약 및 수령 V0", suffix: "/reservations-v0", marketOnly: true },
  { icon: "ms-map", translationKey: "nearbyMap", label: "Nearby Map", suffix: "/map", railOnly: true },
];

/** Jobs has no reservations or notification feed of its own. */
export function dashboardNavItemsFor(context: "market" | "jobs", { railOnly = false } = {}) {
  return dashboardNavItems.filter((item) => {
    if (item.railOnly && !railOnly) return false;
    if (item.marketOnly && context !== "market") return false;
    if (context !== "jobs") return true;
    return item.label !== "Notifications" && item.label !== "Reservations";
  });
}

/** Wishlist lives on the marketplace itself rather than inside the dashboard. */
export function dashboardNavHref(item: DashboardNavItem, context: "market" | "jobs") {
  if (item.label === "My page") return "/market/dashboard/my-page";
  if (item.label === "My page V2") return "/market/dashboard/my-page-v2";
  if (item.label === "Wishlist" && context === "market") return "/market/wishlist";
  if (item.label === "Wishlist V0" && context === "market") return "/market/wishlist-v0";
  return `/${context}/dashboard${item.suffix}`;
}
