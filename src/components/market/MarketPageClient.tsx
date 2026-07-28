"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MobileDrawer, MobileDrawerBackdrop, mobileDrawerClasses, mobileDrawerEvents } from "@/components/MobileDrawer";
import { ProductCard } from "@/components/ProductCard";
import type { Listing } from "@/data/listings";
import { marketplaceCategories } from "@/data/marketplace-categories";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

const LISTING_RENDER_BATCH = 16;

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
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearchQuery = searchParams.get("q") ?? "";
  const selectedCategory = searchParams.get("category") ?? "all";
  const selectedSubcategory = searchParams.get("subcategory") ?? "all";
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [hasManualViewChoice, setHasManualViewChoice] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDashboardDrawerOpen, setIsDashboardDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [applyingChip, setApplyingChip] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(LISTING_RENDER_BATCH);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const selectedCategoryDefinition = useMemo(
    () => marketplaceCategories.find((category) => category.value === selectedCategory),
    [selectedCategory],
  );
  const toolbarCategories = useMemo(
    () => selectedCategoryDefinition
      ? [{ label: "All", value: "all" }, ...selectedCategoryDefinition.subcategories.map(({ label, value }) => ({ label, value }))]
      : quickCategories,
    [selectedCategoryDefinition],
  );
  const visibleListings = useMemo(
    () => postedListings.filter((listing) => {
      const matchesCategory = selectedCategory === "all" || listing.categorySlug === selectedCategory;
      const matchesSubcategory = selectedSubcategory === "all" || listing.subcategorySlug === selectedSubcategory;
      const matchesSearch = !normalizedSearch || [listing.title, listing.location, listing.imageAlt].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      return matchesCategory && matchesSubcategory && matchesSearch;
    }),
    [normalizedSearch, postedListings, selectedCategory, selectedSubcategory],
  );
  const renderedListings = visibleListings.slice(0, visibleCount);
  const savedListingIdSet = useMemo(() => new Set(savedListingIds), [savedListingIds]);

  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  useEffect(() => {
    const updateSearch = (event: Event) => setSearchQuery(typeof (event as CustomEvent<string>).detail === "string" ? (event as CustomEvent<string>).detail : "");
    window.addEventListener("market-search-query-change", updateSearch);
    return () => window.removeEventListener("market-search-query-change", updateSearch);
  }, []);

  useEffect(() => {
    if (searchParams.get("filters") !== "open") return;

    setIsFilterOpen(true);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("filters");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `/market?${nextQuery}` : "/market", { scroll: false });
  }, [router, searchParams]);

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

  useEffect(() => {
    if (!applyingChip) return;
    const timer = window.setTimeout(() => setApplyingChip(null), 420);
    return () => window.clearTimeout(timer);
  }, [applyingChip]);

  useEffect(() => {
    setVisibleCount(LISTING_RENDER_BATCH);
  }, [normalizedSearch, selectedCategory, selectedSubcategory]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || visibleCount >= visibleListings.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((current) => Math.min(current + LISTING_RENDER_BATCH, visibleListings.length));
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, visibleListings.length]);

  const chooseView = (mode: "grid" | "list") => {
    setHasManualViewChoice(true);
    setViewMode(mode);
  };
  const chooseCategory = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("subcategory");
    if (categorySlug === "all") params.delete("category");
    else params.set("category", categorySlug);
    router.push(`/market${params.size ? `?${params.toString()}` : ""}`);
    setIsFilterOpen(false);
  };
  const chooseSubcategory = (subcategorySlug: string) => {
    if (selectedCategory === "all") return;
    const params = new URLSearchParams(searchParams.toString());
    if (subcategorySlug === "all") params.delete("subcategory");
    else params.set("subcategory", subcategorySlug);
    router.push(`/market?${params.toString()}`);
  };
  const chooseToolbarCategory = (categorySlug: string) => {
    setApplyingChip(categorySlug);
    if (selectedCategoryDefinition) chooseSubcategory(categorySlug);
    else chooseCategory(categorySlug);
  };
  return (
    <main className="marketplace-page market-page-with-bottom-dock">
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
          <h2>{t("category")}</h2>
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
          <h2>{t("maxPrice")}</h2>
          <input type="range" min="50" max="5000" defaultValue="5000" />
          <div className="price-range">
            <span>$50</span>
            <span>$5,000</span>
          </div>
        </section>

        <section className="filter-block condition-filter">
          <h2>{t("condition")}</h2>
          <div className="condition-chips">
            {["Any", "New", "Like New", "Excellent", "Good", "Fair"].map((condition) => (
              <button key={condition} className={condition === "Any" ? "is-selected" : ""} type="button">
                {condition}
              </button>
            ))}
          </div>
        </section>

        <button className="apply-filter-button" type="button" onClick={() => setIsFilterOpen(false)}>
          {t("applyFilters")}
        </button>
      </MobileDrawer>
      {isDashboardDrawerOpen && <MobileDrawerBackdrop open onClose={() => window.dispatchEvent(new Event(mobileDrawerEvents.dashboardClose))} ariaLabel="Close dashboard menu" className="mobile-dashboard-backdrop mobile-dashboard-content-backdrop" />}

      <section className="market-results" aria-label="Fresh finds" aria-busy={Boolean(applyingChip)}>
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
            {toolbarCategories.map((category) => {
              const isSelected = selectedCategoryDefinition ? category.value === selectedSubcategory : category.value === selectedCategory;
              return <button
                key={category.value}
                className={`${isSelected ? "is-selected" : ""} ${applyingChip === category.value ? "is-applying" : ""}`}
                type="button"
                aria-pressed={isSelected}
                onClick={() => chooseToolbarCategory(category.value)}
              >
                {category.label}
              </button>;
            })}
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
          {renderedListings.map((listing, index) => (
            <ProductCard key={listing.id} listing={listing} priority={index === 0} initialIsSaved={savedListingIdSet.has(listing.id)} />
          ))}
          {visibleCount < visibleListings.length ? <div ref={loadMoreRef} className="market-list-load-more" aria-hidden="true" /> : null}
        </div> : <div className="market-search-empty" role="status"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><strong>{t("noMatchingListings")}</strong><span>{t("tryDifferentSearch")}</span></div>}
        <div className="market-mobile-bottom-spacer" aria-hidden="true" />

      </section>
    </main>
  );
}
