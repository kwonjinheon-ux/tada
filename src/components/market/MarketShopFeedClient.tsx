"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileDrawer, MobileDrawerBackdrop, mobileDrawerEvents } from "@/components/MobileDrawer";
import { ProductCard } from "@/components/ProductCard";
import { MarketFilterSidebar, type ShopType } from "@/components/market/MarketFilterSidebar";
import { MarketResultsToolbar } from "@/components/market/MarketResultsToolbar";
import type { Listing } from "@/data/listings";
import type { MainLocation } from "@/data/nzLocations";
import { readListingViewPreference, saveListingViewPreference, type ListingViewMode } from "@/lib/market/listing-view-preference";
import { useProfileMainLocation } from "@/lib/market/useProfileMainLocation";

const priceFilterMaximum = 5000;

export function MarketShopFeedClient({ shopType, basePath, emptyLabel, listings, savedListingIds = [] }: {
  shopType: Extract<ShopType, "garage-sale" | "moving-sale" | "2dollarshop">;
  basePath: string;
  emptyLabel: string;
  listings: Listing[];
  savedListingIds?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedMaxPrice = Number(searchParams.get("maxPrice")) || priceFilterMaximum;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDashboardDrawerOpen, setIsDashboardDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ListingViewMode>("grid");
  const [maxPrice, setMaxPrice] = useState(appliedMaxPrice);
  const [condition, setCondition] = useState(searchParams.get("condition") ?? "all");
  const [mainLocation, setMainLocation] = useState<MainLocation | "">((searchParams.get("mainLocation") as MainLocation | null) ?? "");
  const [subLocation, setSubLocation] = useState(searchParams.get("subLocation") ?? "");
  const savedIdSet = new Set(savedListingIds);

  useEffect(() => {
    const openFilters = (event: Event) => {
      const service = (event as CustomEvent<"market" | "bargain" | undefined>).detail;
      if (!service || service === "bargain") setIsFilterOpen(true);
    };
    const closeFilters = () => setIsFilterOpen(false);
    window.addEventListener("mobile-category-menu-request", openFilters);
    window.addEventListener("mobile-category-menu-close", closeFilters);
    return () => { window.removeEventListener("mobile-category-menu-request", openFilters); window.removeEventListener("mobile-category-menu-close", closeFilters); };
  }, []);
  useEffect(() => {
    const setResponsiveView = () => { setViewMode(readListingViewPreference() ?? (window.innerWidth < 1024 ? "list" : "grid")); if (window.innerWidth >= 768) setIsFilterOpen(false); };
    setResponsiveView(); window.addEventListener("resize", setResponsiveView); return () => window.removeEventListener("resize", setResponsiveView);
  }, []);
  useEffect(() => {
    const syncDashboardDrawer = (event: Event) => setIsDashboardDrawerOpen(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener(mobileDrawerEvents.dashboardState, syncDashboardDrawer);
    return () => window.removeEventListener(mobileDrawerEvents.dashboardState, syncDashboardDrawer);
  }, []);

  const updateParams = useCallback((changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => { if (value) params.set(key, value); else params.delete(key); });
    router.push(`${basePath}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }, [basePath, router, searchParams]);
  const chooseCategory = (categorySlug: string) => { updateParams({ category: categorySlug === "all" ? null : categorySlug }); setIsFilterOpen(false); };
  const changeLocation = (nextMainLocation: MainLocation | "", nextSubLocation = "") => {
    setMainLocation(nextMainLocation);
    setSubLocation(nextSubLocation);
    updateParams({ mainLocation: nextMainLocation || null, subLocation: nextSubLocation || null });
  };
  useProfileMainLocation({
    hasMainLocationInUrl: searchParams.has("mainLocation"),
    mainLocation,
    onResolve: (profileMainLocation) => changeLocation(profileMainLocation, subLocation),
  });
  const applyFilters = () => {
    updateParams({ maxPrice: maxPrice >= priceFilterMaximum ? null : String(maxPrice), condition: condition === "all" ? null : condition });
    setIsFilterOpen(false);
  };
  const chooseView = (mode: ListingViewMode) => { setViewMode(mode); saveListingViewPreference(mode); };

  return <main className="marketplace-page bargain-page market-page-with-bottom-dock">
    <button className={`floating-filter-button ${isFilterOpen ? "is-open" : ""}`} type="button" aria-label={isFilterOpen ? "Close filters" : "Open filters"} aria-expanded={isFilterOpen} onClick={() => setIsFilterOpen((open) => !open)}>
      <i className="fa-solid fa-sliders filter-toggle-icon filter-toggle-icon-open" aria-hidden="true" />
      <i className="fa-solid fa-xmark filter-toggle-icon filter-toggle-icon-close" aria-hidden="true" />
    </button>
    <MobileDrawer open={isFilterOpen} onClose={() => setIsFilterOpen(false)} ariaLabel="Close filters" className="filter-backdrop" panelClassName="market-filter-panel">
      <button className="filter-close-button" type="button" aria-label="Close filters" onClick={() => setIsFilterOpen(false)}>
        <i className="fa-solid fa-xmark" aria-hidden="true" />
      </button>
      <MarketFilterSidebar
        activeShopType={shopType}
        activeCategory={searchParams.get("category") ?? "all"}
        onCategorySelect={chooseCategory}
        mainLocation={mainLocation}
        subLocation={subLocation}
        onLocationChange={changeLocation}
        priceCondition={{ maxPrice, condition, onMaxPriceChange: setMaxPrice, onConditionChange: setCondition, onApply: applyFilters }}
      />
    </MobileDrawer>
    {isDashboardDrawerOpen && <MobileDrawerBackdrop open onClose={() => window.dispatchEvent(new Event(mobileDrawerEvents.dashboardClose))} ariaLabel="Close dashboard menu" className="mobile-dashboard-backdrop mobile-dashboard-content-backdrop" />}
    <section className="market-results bargain-results" aria-label="Listings">
      <MarketResultsToolbar
        viewMode={viewMode}
        onViewModeChange={chooseView}
        sortValue={searchParams.get("sort") ?? "newest"}
        onSortChange={(value) => updateParams({ sort: value === "newest" ? null : value })}
        resultsLabel={`Showing ${listings.length} ${listings.length === 1 ? "listing" : "listings"}`}
      />
      {listings.length ? <div className={`product-grid ${viewMode === "list" ? "is-list-view" : ""}`}>
        {listings.map((listing, index) => <ProductCard key={listing.id} listing={listing} priority={index === 0} initialIsSaved={savedIdSet.has(listing.id)} listingHref={`/market/${listing.id}`} wishlistEndpoint="/api/bargain/wishlist" />)}
      </div> : <div className="market-search-empty" role="status"><i className="fa-solid fa-tags" aria-hidden="true" /><strong>{emptyLabel}</strong><span>Try another category or nearby location.</span></div>}
    </section>
  </main>;
}
