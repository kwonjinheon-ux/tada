export type ListingViewMode = "grid" | "list";
export type ListingViewPreferenceScope = "market" | "community";

const storageKeyByScope: Record<ListingViewPreferenceScope, string> = {
  market: "tada-market-view-mode",
  community: "tada-community-view-mode",
};

export function readListingViewPreference(scope: ListingViewPreferenceScope = "market"): ListingViewMode | null {
  try {
    const value = window.localStorage.getItem(storageKeyByScope[scope]);
    return value === "grid" || value === "list" ? value : null;
  } catch {
    return null;
  }
}

export function saveListingViewPreference(value: ListingViewMode, scope: ListingViewPreferenceScope = "market") {
  try {
    window.localStorage.setItem(storageKeyByScope[scope], value);
  } catch {
    // Keep the selected view for the active visit when storage is unavailable.
  }
}
