"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MobileDrawer, MobileDrawerBackdrop, mobileDrawerClasses, mobileDrawerEvents } from "@/components/MobileDrawer";
import { ProductCard } from "@/components/ProductCard";
import type { Listing } from "@/data/listings";
import { listings, quickCategories } from "@/data/listings";

const filters = [
  ["fa-border-all", "All"],
  ["fa-warehouse", "Garage Sale"],
  ["fa-laptop", "Electronics"],
  ["fa-couch", "Home & Furniture"],
  ["fa-shirt", "Clothing"],
  ["fa-film", "Entertainment"],
  ["fa-baby", "Baby & Kids"],
  ["fa-paw", "Pets"],
  ["fa-book-open", "Books"],
  ["fa-gamepad", "Hobbies"],
  ["fa-seedling", "Garden & Outdoors"],
  ["fa-futbol", "Sporting Goods"],
];

export function MarketPageClient({ postedListings = [] }: { postedListings?: Listing[] }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [hasManualViewChoice, setHasManualViewChoice] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDashboardDrawerOpen, setIsDashboardDrawerOpen] = useState(false);

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
  const visibleListings = [...postedListings, ...listings.filter((listing) => !postedListings.some((posted) => posted.id === listing.id))];

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
        <Link className="dashboard-link" href="/market/dashboard" onClick={() => setIsFilterOpen(false)}>
          <i className="fa-solid fa-chart-line" aria-hidden="true" />
          <span>My Dashboard</span>
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        </Link>
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
            {filters.map(([icon, label]) => (
              <button key={label} className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} ${label === "All" ? "is-selected" : ""}`} type="button" onClick={() => setIsFilterOpen(false)}>
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
              <button key={category} className={category === "All" ? "is-selected" : ""} type="button">
                {category}
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

        <div className={`product-grid ${viewMode === "list" ? "is-list-view" : ""}`}>
          {visibleListings.map((listing, index) => (
            <ProductCard key={listing.id} listing={listing} priority={index === 0} />
          ))}
        </div>

        <button className="load-more-button" type="button">
          Load More Items
        </button>
      </section>
    </main>
  );
}
