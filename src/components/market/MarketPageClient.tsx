"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileDrawer, MobileDrawerBackdrop, mobileDrawerClasses, mobileDrawerEvents } from "@/components/MobileDrawer";
import { ProductCard } from "@/components/ProductCard";
import type { Listing } from "@/data/listings";
import { listings } from "@/data/listings";
import { marketplaceCategories } from "@/data/marketplace-categories";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const categoryIcons: Record<string, string> = {
  "mobile-phones-tablets": "fa-mobile-screen-button",
  "computers-laptops": "fa-laptop",
  "electronics-appliances": "fa-tv",
  "furniture-home-decor": "fa-couch",
  "home-kitchen": "fa-kitchen-set",
  "clothing-fashion": "fa-shirt",
  "baby-kids": "fa-baby",
  "books-music-media": "fa-book-open",
  "hobbies-collectables": "fa-gem",
  "games-toys": "fa-gamepad",
  "sports-leisure": "fa-futbol",
  "musical-instruments": "fa-guitar",
  "garden-tools-diy": "fa-screwdriver-wrench",
  "pet-supplies": "fa-paw",
  "health-beauty": "fa-heart-pulse",
};

const quickCategories = [{ label: "All", value: "all" }, ...marketplaceCategories.slice(0, 6).map(({ label, value }) => ({ label, value }))];

export function MarketPageClient({ postedListings = [], savedListingIds = [] }: { postedListings?: Listing[]; savedListingIds?: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearchQuery = searchParams.get("q") ?? "";
  const selectedCategory = searchParams.get("category") ?? "all";
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [hasManualViewChoice, setHasManualViewChoice] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDashboardDrawerOpen, setIsDashboardDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);

  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  useEffect(() => {
    const updateSearch = (event: Event) => setSearchQuery(typeof (event as CustomEvent<string>).detail === "string" ? (event as CustomEvent<string>).detail : "");
    window.addEventListener("market-search-query-change", updateSearch);
    return () => window.removeEventListener("market-search-query-change", updateSearch);
  }, []);

  useEffect(() => {
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;
      let refreshFrame: number | null = null;
      const channel = supabase
        .channel("market-listing-status-live")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_listings" }, () => {
          if (refreshFrame !== null) return;
          refreshFrame = window.requestAnimationFrame(() => {
            refreshFrame = null;
            router.refresh();
          });
        })
        .subscribe();
      return () => {
        if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);
        void supabase.removeChannel(channel).catch(() => undefined);
      };
    } catch {
      return;
    }
  }, [router]);

  useEffect(() => {
    const setResponsiveView = () => {
      if (!hasManualViewChoice) {
        setViewMode(window.innerWidth < 1024 ? "list" : "grid");
      }

      if (window.innerWidth >= 768) {
        setIsFilterOpen(false);
      }
    };

    setResponsiveView();
    window.addEventListener("resize", setResponsiveView);
    return () => window.removeEventListener("resize", setResponsiveView);
  }, [hasManualViewChoice]);

  useEffect(() => {
    const openCategories = () => setIsFilterOpen(true);
    const closeCategories = () => setIsFilterOpen(false);
    window.addEventListener("mobile-category-menu-request", openCategories);
    window.addEventListener("mobile-category-menu-close", closeCategories);
    return () => {
      window.removeEventListener("mobile-category-menu-request", openCategories);
      window.removeEventListener("mobile-category-menu-close", closeCategories);
    };
  }, []);

  useEffect(() => {
    const syncDashboardDrawer = (event: Event) => setIsDashboardDrawerOpen(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener(mobileDrawerEvents.dashboardState, syncDashboardDrawer);
    return () => window.removeEventListener(mobileDrawerEvents.dashboardState, syncDashboardDrawer);
  }, []);

  const chooseView = (mode: "grid" | "list") => {
    setHasManualViewChoice(true);
    setViewMode(mode);
  };
  const chooseCategory = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categorySlug === "all") params.delete("category");
    else params.set("category", categorySlug);
    router.push(`/market${params.size ? `?${params.toString()}` : ""}`);
    setIsFilterOpen(false);
  };
  const allListings = [...postedListings, ...listings.filter((listing) => !postedListings.some((posted) => posted.id === listing.id))];
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const visibleListings = allListings.filter((listing) => {
    const matchesCategory = selectedCategory === "all" || listing.categorySlug === selectedCategory;
    const matchesSearch = !normalizedSearch || [listing.title, listing.location, listing.imageAlt].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="marketplace-page">
      <button
        className={`floating-filter-button ${isFilterOpen ? "is-open" : ""}`}
        type="button"
        aria-label={isFilterOpen ? "Close marketplace filters" : "Open marketplace filters"}
        aria-expanded={isFilterOpen}
        onClick={() => setIsFilterOpen((current) => !current)}
      >
        <i className="fa-solid fa-sliders filter-toggle-icon filter-toggle-icon-open" aria-hidden="true" />
        <i className="fa-solid fa-xmark filter-toggle-icon filter-toggle-icon-close" aria-hidden="true" />
      </button>

      <MobileDrawer open={isFilterOpen} onClose={() => setIsFilterOpen(false)} ariaLabel="Close marketplace filters" className="filter-backdrop" panelClassName="market-filter-panel">
        <button className={`filter-close-button ${mobileDrawerClasses.closeButton} ${mobileDrawerClasses.staggerItem}`} type="button" aria-label="Close marketplace filters" onClick={() => setIsFilterOpen(false)}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
        <section className="filter-block location-block">
          <button className="location-select" type="button">
            <i className="fa-solid fa-location-dot" aria-hidden="true" />
            <span>Auckland, NZ</span>
            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
          </button>
        </section>

        <section className="filter-block category-filter">
          <h2>Category</h2>
          <div className="filter-list">
            {[{ label: "All", value: "all", icon: "fa-border-all" }, ...marketplaceCategories.map(({ label, value }) => ({ label, value, icon: categoryIcons[value] }))].map(({ icon, label, value }) => (
              <button key={value} className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} ${selectedCategory === value ? "is-selected" : ""}`} type="button" onClick={() => chooseCategory(value)}>
                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                <span className={mobileDrawerClasses.menuLabel}>{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="filter-block price-filter">
          <h2>Max Price (NZD)</h2>
          <input type="range" min="50" max="5000" defaultValue="5000" />
          <div className="price-range">
            <span>$50</span>
            <span>$5,000</span>
          </div>
        </section>

        <section className="filter-block condition-filter">
          <h2>Condition</h2>
          <div className="condition-chips">
            {["Any", "New", "Like New", "Excellent", "Good", "Fair"].map((condition) => (
              <button key={condition} className={condition === "Any" ? "is-selected" : ""} type="button">
                {condition}
              </button>
            ))}
          </div>
        </section>

        <button className="apply-filter-button" type="button" onClick={() => setIsFilterOpen(false)}>
          Apply Filters
        </button>
      </MobileDrawer>
      {isDashboardDrawerOpen && <MobileDrawerBackdrop open onClose={() => window.dispatchEvent(new Event(mobileDrawerEvents.dashboardClose))} ariaLabel="Close dashboard menu" className="mobile-dashboard-backdrop mobile-dashboard-content-backdrop" />}

      <section className="market-results" aria-label="Fresh finds">
        <div className="market-toolbar">
          <div className="view-toggle" aria-label="View mode">
            <button className={viewMode === "list" ? "is-selected" : ""} type="button" aria-label="List view" aria-pressed={viewMode === "list"} onClick={() => chooseView("list")}>
              <i className="fa-solid fa-list" aria-hidden="true" />
            </button>
            <button className={viewMode === "grid" ? "is-selected" : ""} type="button" aria-label="Grid view" aria-pressed={viewMode === "grid"} onClick={() => chooseView("grid")}>
              <i className="fa-solid fa-border-all" aria-hidden="true" />
            </button>
          </div>

          <div className="market-chip-row" aria-label="Quick categories">
            {quickCategories.map((category) => (
              <button key={category.value} className={category.value === selectedCategory ? "is-selected" : ""} type="button" onClick={() => chooseCategory(category.value)}>
                {category.label}
              </button>
            ))}
          </div>

          <div className="market-tools">
            <label className="sort-control" aria-label="Sort listings">
              <select defaultValue="Newest">
                <option>Newest</option>
                <option>Low to High</option>
                <option>High to Low</option>
                <option>Recommended</option>
              </select>
            </label>
          </div>
        </div>

        {visibleListings.length ? <div className={`product-grid ${viewMode === "list" ? "is-list-view" : ""}`}>
          {visibleListings.map((listing, index) => (
            <ProductCard key={listing.id} listing={listing} priority={index === 0} initialIsSaved={savedListingIds.includes(listing.id)} />
          ))}
        </div> : <div className="market-search-empty" role="status"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><strong>No matching listings</strong><span>Try a different search or category.</span></div>}

      </section>
    </main>
  );
}
