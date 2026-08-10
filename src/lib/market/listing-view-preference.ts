export type ListingViewMode = "grid" | "list";

const storageKey = "tada-listing-view-mode";

export function readListingViewPreference(): ListingViewMode | null {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value === "grid" || value === "list" ? value : null;
  } catch {
    return null;
  }
}

export function saveListingViewPreference(value: ListingViewMode) {
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // Keep the selected view for the active visit when storage is unavailable.
  }
}
