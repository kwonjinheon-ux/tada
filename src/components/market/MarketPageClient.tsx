"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { marketFeedResponseSchema } from "@/contracts/api";
import { MobileDrawer, MobileDrawerBackdrop, mobileDrawerClasses, mobileDrawerEvents } from "@/components/MobileDrawer";
import { ProductCard } from "@/components/ProductCard";
import { AdSlot } from "@/components/advertising/AdSlot";
import { SelectMenu } from "@/components/ui/SelectMenu";
import type { Listing } from "@/data/listings";
import { marketplaceCategories } from "@/data/marketplace-categories";
import { NZ_MAIN_LOCATIONS, getSubLocations, type MainLocation } from "@/data/nzLocations";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { readApiResponse } from "@/lib/api/client";
import { useLanguage } from "@/components/LanguageProvider";

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

const quickCategories = marketplaceCategories.slice(0, 6).map(({ label, value }) => ({ label, value }));
const priceFilterMinimum = 50;
const priceFilterMaximum = 5000;
const conditionFilters = ["all", "brand_new", "like_new", "excellent", "good", "fair"] as const;
const conditionTranslationKeys = { all: "any", brand_new: "brandNew", like_new: "likeNew", excellent: "excellent", good: "good", fair: "fair" } as const;

export function MarketPageClient({ postedListings = [], savedListingIds = [], nextCursor = null }: { postedListings?: Listing[]; savedListingIds?: string[]; nextCursor?: string | null }) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearchQuery = searchParams.get("q") ?? "";
  const selectedCategory = searchParams.get("category") ?? "all";
  const selectedSubcategory = searchParams.get("subcategory") ?? "all";
  const appliedMaxPrice = Number(searchParams.get("maxPrice")) || priceFilterMaximum;
  const appliedCondition = conditionFilters.includes(searchParams.get("condition") as typeof conditionFilters[number]) ? searchParams.get("condition")! : "all";
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [hasManualViewChoice, setHasManualViewChoice] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDashboardDrawerOpen, setIsDashboardDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [maxPrice, setMaxPrice] = useState(appliedMaxPrice);
  const [condition, setCondition] = useState(appliedCondition);
  const [mainLocation, setMainLocation] = useState<MainLocation | "">((searchParams.get("mainLocation") as MainLocation | null) ?? "");
  const [subLocation, setSubLocation] = useState(searchParams.get("subLocation") ?? "");
  const [applyingChip, setApplyingChip] = useState<string | null>(null);
  const [listings, setListings] = useState(postedListings);
  const [savedIds, setSavedIds] = useState(savedListingIds);
  const [nextPageCursor, setNextPageCursor] = useState<string | null>(nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isLoadRequestInFlight = useRef(false);
  const selectedCategoryDefinition = useMemo(
    () => marketplaceCategories.find((category) => category.value === selectedCategory),
    [selectedCategory],
  );
  const conditionLabel = (value: typeof conditionFilters[number]) => t(conditionTranslationKeys[value]);
  const toolbarCategories = useMemo(
    () => selectedCategoryDefinition
      ? [{ label: t("all"), value: "all" }, ...selectedCategoryDefinition.subcategories.map(({ label, value }) => ({ label, value }))]
      : [{ label: t("all"), value: "all" }, ...quickCategories],
    [selectedCategoryDefinition, t],
  );
  const savedListingIdSet = useMemo(() => new Set(savedIds), [savedIds]);

  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  useEffect(() => {
    setMaxPrice(appliedMaxPrice);
    setCondition(appliedCondition);
  }, [appliedCondition, appliedMaxPrice]);

  useEffect(() => {
    setMainLocation((searchParams.get("mainLocation") as MainLocation | null) ?? "");
    setSubLocation(searchParams.get("subLocation") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setListings(postedListings);
    setSavedIds(savedListingIds);
    setNextPageCursor(nextCursor);
  }, [nextCursor, postedListings, savedListingIds]);

  useEffect(() => {
    const updateSearch = (event: Event) => setSearchQuery(typeof (event as CustomEvent<string>).detail === "string" ? (event as CustomEvent<string>).detail : "");
    window.addEventListener("market-search-query-change", updateSearch);
    return () => window.removeEventListener("market-search-query-change", updateSearch);
  }, []);

  useEffect(() => {
    if (searchQuery === urlSearchQuery) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("cursor");
      if (searchQuery.trim()) params.set("q", searchQuery.trim()); else params.delete("q");
      router.replace(`/market${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [router, searchParams, searchQuery, urlSearchQuery]);

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
    const openCategories = (event: Event) => {
      const service = (event as CustomEvent<"market" | "bargain" | undefined>).detail;
      if (!service || service === "market") setIsFilterOpen(true);
    };
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
    const sentinel = loadMoreRef.current;
    if (!sentinel || !nextPageCursor || isLoadingMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isLoadRequestInFlight.current) {
          isLoadRequestInFlight.current = true;
          setIsLoadingMore(true);
          const params = new URLSearchParams(searchParams.toString());
          params.set("cursor", nextPageCursor);
          void fetch(`/api/market/listings?${params.toString()}`)
            .then((response) => readApiResponse(response, marketFeedResponseSchema))
            .then((result) => {
              if (!result.data) return;
              setListings((current) => [...current, ...result.data.listings.filter((listing) => !current.some((item) => item.id === listing.id))]);
              setSavedIds((current) => [...new Set([...current, ...result.data.savedListingIds])]);
              setNextPageCursor(result.data.nextCursor);
            })
            .finally(() => {
              isLoadRequestInFlight.current = false;
              setIsLoadingMore(false);
            });
        }
      },
      // Fire well before the sentinel is actually on screen — about a viewport and a
      // half of scroll lead-time — so the next page is already in by the time the
      // user reaches the bottom. No spinner, no message: it should just never run out.
      { rootMargin: "1200px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoadingMore, nextPageCursor, searchParams]);

  const chooseView = (mode: "grid" | "list") => {
    setHasManualViewChoice(true);
    setViewMode(mode);
  };
  const chooseCategory = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    params.delete("subcategory");
    if (categorySlug === "all") params.delete("category");
    else params.set("category", categorySlug);
    router.push(`/market${params.size ? `?${params.toString()}` : ""}`);
    setIsFilterOpen(false);
  };
  const chooseSubcategory = (subcategorySlug: string) => {
    if (selectedCategory === "all") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    if (subcategorySlug === "all") params.delete("subcategory");
    else params.set("subcategory", subcategorySlug);
    router.push(`/market?${params.toString()}`);
  };
  const chooseToolbarCategory = (categorySlug: string) => {
    setApplyingChip(categorySlug);
    if (selectedCategoryDefinition) chooseSubcategory(categorySlug);
    else chooseCategory(categorySlug);
  };
  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    if (maxPrice >= priceFilterMaximum) params.delete("maxPrice"); else params.set("maxPrice", String(maxPrice));
    if (condition === "all") params.delete("condition"); else params.set("condition", condition);
    if (mainLocation) params.set("mainLocation", mainLocation); else params.delete("mainLocation");
    if (subLocation) params.set("subLocation", subLocation); else params.delete("subLocation");
    router.push(`/market${params.size ? `?${params.toString()}` : ""}`);
    setIsFilterOpen(false);
  };
  const applyLocationFilter = (nextMainLocation: MainLocation | "", nextSubLocation = "") => {
    setMainLocation(nextMainLocation);
    setSubLocation(nextSubLocation);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    if (nextMainLocation) params.set("mainLocation", nextMainLocation); else params.delete("mainLocation");
    if (nextSubLocation) params.set("subLocation", nextSubLocation); else params.delete("subLocation");
    router.push(`/market${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
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
        <section className="filter-block location-block market-filter-location-section">
          <h2>Location</h2>
          <SelectMenu id="market-main-location" name="mainLocation" label="Main Location" icon="fa-location-dot" placeholder="All New Zealand" options={NZ_MAIN_LOCATIONS.map((location) => ({ label: location, value: location }))} value={mainLocation} onChange={(nextLocation) => applyLocationFilter(nextLocation as MainLocation | "")} className="market-location-select" hideLabel />
          <SelectMenu id="market-sub-location" name="subLocation" label="Sub Location" icon="fa-map-pin" placeholder="Any sub location" options={mainLocation ? getSubLocations(mainLocation).map((location) => ({ label: location, value: location })) : []} value={subLocation} disabled={!mainLocation} onChange={(nextSubLocation) => applyLocationFilter(mainLocation, nextSubLocation)} className="market-location-select" hideLabel />
        </section>

        <section className="filter-block category-filter">
          <h2>{t("category")}</h2>
          <div className="filter-list">
            {[{ label: t("all"), value: "all", icon: "fa-border-all" }, ...marketplaceCategories.map(({ label, value }) => ({ label, value, icon: categoryIcons[value] }))].map(({ icon, label, value }) => (
              <button key={value} className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} ${selectedCategory === value ? "is-selected" : ""}`} type="button" onClick={() => chooseCategory(value)}>
                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                <span className={mobileDrawerClasses.menuLabel}>{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="filter-block price-filter">
          <h2>{t("maxPrice")}</h2>
          <input type="range" min={priceFilterMinimum} max={priceFilterMaximum} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} aria-valuetext={`$${maxPrice.toLocaleString()}`} />
          <div className="price-range">
            <span>${priceFilterMinimum}</span>
            <span>${maxPrice.toLocaleString()}</span>
          </div>
        </section>

        <section className="filter-block condition-filter">
          <h2>{t("condition")}</h2>
          <div className="condition-chips">
            {conditionFilters.map((value) => (
              <button key={value} className={condition === value ? "is-selected" : ""} type="button" aria-pressed={condition === value} onClick={() => setCondition(value)}>
                {conditionLabel(value)}
              </button>
            ))}
          </div>
        </section>

        <button className="apply-filter-button" type="button" onClick={applyFilters}>
          {t("applyFilters")}
        </button>
      </MobileDrawer>
      {isDashboardDrawerOpen && <MobileDrawerBackdrop open onClose={() => window.dispatchEvent(new Event(mobileDrawerEvents.dashboardClose))} ariaLabel="Close dashboard menu" className="mobile-dashboard-backdrop mobile-dashboard-content-backdrop" />}

      <section className="market-results" aria-label="Fresh finds" aria-busy={Boolean(applyingChip)}>
        <div className="market-toolbar">
          <div className="view-toggle" aria-label={t("viewMode")}>
            <button className={viewMode === "list" ? "is-selected" : ""} type="button" aria-label={t("listView")} aria-pressed={viewMode === "list"} onClick={() => chooseView("list")}>
              <i className="fa-solid fa-list" aria-hidden="true" />
            </button>
            <button className={viewMode === "grid" ? "is-selected" : ""} type="button" aria-label={t("gridView")} aria-pressed={viewMode === "grid"} onClick={() => chooseView("grid")}>
              <i className="fa-solid fa-border-all" aria-hidden="true" />
            </button>
          </div>

          <div className="market-chip-row" aria-label={t("quickCategories")}>
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
            <label className="sort-control" aria-label={t("sortListings")}>
              <select value={searchParams.get("sort") ?? "newest"} onChange={(event) => { const params = new URLSearchParams(searchParams.toString()); params.delete("cursor"); if (event.target.value === "newest") params.delete("sort"); else params.set("sort", event.target.value); router.push(`/market${params.size ? `?${params.toString()}` : ""}`); }}>
                <option value="newest">{t("newest")}</option>
                <option value="priceAsc">{t("lowToHigh")}</option>
                <option value="priceDesc">{t("highToLow")}</option>
              </select>
            </label>
          </div>
        </div>

        <AdSlot placement="market_top" />

        {listings.length ? <div className={`product-grid ${viewMode === "list" ? "is-list-view" : ""}`}>
          {listings.flatMap((listing, index) => [
            <ProductCard key={listing.id} listing={listing} priority={index === 0} initialIsSaved={savedListingIdSet.has(listing.id)} />,
            (index === 7 || (index > 7 && (index - 7) % 12 === 0)) ? <AdSlot key={`ad-${listing.id}`} placement={urlSearchQuery ? "search_feed" : "market_feed"} /> : null,
          ])}
          {nextPageCursor ? <div ref={loadMoreRef} className="market-list-load-more" aria-hidden="true" /> : null}
        </div> : <div className="market-search-empty" role="status"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><strong>{t("noMatchingListings")}</strong><span>{t("tryDifferentSearch")}</span></div>}

      </section>
    </main>
  );
}
