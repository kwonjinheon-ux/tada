"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileDrawer, mobileDrawerClasses } from "@/components/MobileDrawer";
import { ProductCard } from "@/components/ProductCard";
import { SelectMenu } from "@/components/ui/SelectMenu";
import type { Listing } from "@/data/listings";
import { NZ_MAIN_LOCATIONS, getSubLocations, type MainLocation } from "@/data/nzLocations";

const bargainCategories = [
  { value: "all", label: "All Bargains", icon: "fa-tag" },
  { value: "2-dollar-deals", label: "$2 Deals", icon: "fa-coins" },
  { value: "5-dollar-deals", label: "$5 Deals", icon: "fa-tags" },
  { value: "10-dollar-deals", label: "$10 Deals", icon: "fa-ticket" },
  { value: "moving-sale", label: "Moving Sale", icon: "fa-truck-ramp-box" },
  { value: "garage-sale", label: "Garage Sale", icon: "fa-warehouse" },
  { value: "newly-listed", label: "Newly Listed", icon: "fa-bolt" },
  { value: "nearby-deals", label: "Nearby Deals", icon: "fa-location-dot" },
] as const;
type BargainType = (typeof bargainCategories)[number]["value"];

function matchesBargainType(listing: Listing, bargain: BargainType) {
  if (["2-dollar-deals", "5-dollar-deals", "10-dollar-deals", "moving-sale", "garage-sale"].includes(bargain)) return listing.bargainType === bargain;
  return true;
}

export function BargainPageClient({ postedListings = [], savedListingIds = [] }: { postedListings?: Listing[]; savedListingIds?: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bargain = (searchParams.get("bargain") as BargainType | null) ?? "all";
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mainLocation, setMainLocation] = useState<MainLocation | "">((searchParams.get("mainLocation") as MainLocation | null) ?? "");
  const [subLocation, setSubLocation] = useState(searchParams.get("subLocation") ?? "");
  const savedIdSet = useMemo(() => new Set(savedListingIds), [savedListingIds]);
  const listings = useMemo(() => postedListings.filter((listing) => matchesBargainType(listing, bargain)), [bargain, postedListings]);

  useEffect(() => {
    const openFilters = () => setIsFilterOpen(true);
    const closeFilters = () => setIsFilterOpen(false);
    window.addEventListener("mobile-category-menu-request", openFilters);
    window.addEventListener("mobile-category-menu-close", closeFilters);
    return () => { window.removeEventListener("mobile-category-menu-request", openFilters); window.removeEventListener("mobile-category-menu-close", closeFilters); };
  }, []);
  useEffect(() => {
    const setResponsiveView = () => { setViewMode(window.innerWidth < 1024 ? "list" : "grid"); if (window.innerWidth >= 768) setIsFilterOpen(false); };
    setResponsiveView(); window.addEventListener("resize", setResponsiveView); return () => window.removeEventListener("resize", setResponsiveView);
  }, []);

  const updateParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString()); params.delete("cursor");
    Object.entries(changes).forEach(([key, value]) => { if (value) params.set(key, value); else params.delete(key); });
    router.push(`/bargain${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  };
  const chooseBargain = (value: BargainType) => { updateParams({ bargain: value === "all" ? null : value, sort: value === "newly-listed" ? "newest" : null }); setIsFilterOpen(false); };
  const changeMainLocation = (value: MainLocation | "") => { setMainLocation(value); setSubLocation(""); updateParams({ mainLocation: value || null, subLocation: null }); };
  const changeSubLocation = (value: string) => { setSubLocation(value); updateParams({ subLocation: value || null }); };

  return <main className="marketplace-page bargain-page market-page-with-bottom-dock">
    <button className={`floating-filter-button ${isFilterOpen ? "is-open" : ""}`} type="button" aria-label={isFilterOpen ? "Close bargain filters" : "Open bargain filters"} aria-expanded={isFilterOpen} onClick={() => setIsFilterOpen((open) => !open)}><i className="fa-solid fa-sliders filter-toggle-icon filter-toggle-icon-open" aria-hidden="true" /><i className="fa-solid fa-xmark filter-toggle-icon filter-toggle-icon-close" aria-hidden="true" /></button>
    <MobileDrawer open={isFilterOpen} onClose={() => setIsFilterOpen(false)} ariaLabel="Close bargain filters" className="filter-backdrop" panelClassName="market-filter-panel">
      <button className={`filter-close-button ${mobileDrawerClasses.closeButton} ${mobileDrawerClasses.staggerItem}`} type="button" aria-label="Close bargain filters" onClick={() => setIsFilterOpen(false)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
      <section className="filter-block location-block market-filter-location-section"><h2>Location</h2><SelectMenu id="bargain-main-location" name="mainLocation" label="Main Location" icon="fa-location-dot" placeholder="All New Zealand" options={NZ_MAIN_LOCATIONS.map((location) => ({ label: location, value: location }))} value={mainLocation} onChange={(value) => changeMainLocation(value as MainLocation | "")} className="market-location-select" hideLabel /><SelectMenu id="bargain-sub-location" name="subLocation" label="Sub Location" icon="fa-map-pin" placeholder="Any sub location" options={mainLocation ? getSubLocations(mainLocation).map((location) => ({ label: location, value: location })) : []} value={subLocation} disabled={!mainLocation} onChange={changeSubLocation} className="market-location-select" hideLabel /></section>
      <section className="filter-block category-filter"><h2>Bargain type</h2><div className="filter-list bargain-category-list">{bargainCategories.map((category) => <button key={category.value} className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} bargain-category-${category.value} ${bargain === category.value ? "is-selected" : ""}`} type="button" onClick={() => chooseBargain(category.value)}><i className={`fa-solid ${category.icon}`} aria-hidden="true" /><span className={mobileDrawerClasses.menuLabel}>{category.label}</span></button>)}</div></section>
      <aside className="bargain-nearby-card"><i className="fa-solid fa-location-dot" aria-hidden="true" /><div><strong>Find cheap deals near you!</strong><p>Great items, tiny prices, right in your neighbourhood.</p><button type="button" onClick={() => document.querySelector<HTMLButtonElement>("#bargain-main-location + .post-select-trigger")?.click()}>Turn on location <i className="fa-solid fa-chevron-right" aria-hidden="true" /></button></div></aside>
    </MobileDrawer>
    <section className="market-results bargain-results" aria-label="Bargain listings">
      <div className="market-toolbar bargain-toolbar"><div className="view-toggle" aria-label="View mode"><button className={viewMode === "grid" ? "is-selected" : ""} type="button" aria-label="Grid view" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")}><i className="fa-solid fa-border-all" aria-hidden="true" /></button><button className={viewMode === "list" ? "is-selected" : ""} type="button" aria-label="List view" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}><i className="fa-solid fa-list" aria-hidden="true" /></button></div><label className="sort-control" aria-label="Sort bargains"><select value={searchParams.get("sort") ?? "newest"} onChange={(event) => updateParams({ sort: event.target.value === "newest" ? null : event.target.value })}><option value="newest">Newest</option><option value="priceAsc">Low to High</option><option value="priceDesc">High to Low</option></select></label><p>Showing {listings.length} bargain{listings.length === 1 ? "" : "s"}</p></div>
      {listings.length ? <div className={`product-grid ${viewMode === "list" ? "is-list-view" : ""}`}>{listings.map((listing, index) => <ProductCard key={listing.id} listing={listing} priority={index === 0} initialIsSaved={savedIdSet.has(listing.id)} listingHref="/bargain" persistSave={false} />)}</div> : <div className="market-search-empty" role="status"><i className="fa-solid fa-tags" aria-hidden="true" /><strong>No bargains found yet</strong><span>Try another deal type or nearby location.</span></div>}
    </section>
  </main>;
}
