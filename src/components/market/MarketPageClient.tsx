"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { marketFeedResponseSchema } from "@/contracts/api";
import { MobileDrawer, MobileDrawerBackdrop, mobileDrawerEvents } from "@/components/MobileDrawer";
import { ProductCard } from "@/components/ProductCard";
import { AdSlot } from "@/components/advertising/AdSlot";
import { MarketFilterSidebar, type ShopType } from "@/components/market/MarketFilterSidebar";
import { MarketResultsToolbar } from "@/components/market/MarketResultsToolbar";
import type { Listing } from "@/data/listings";
import { marketplaceCategories } from "@/data/marketplace-categories";
import type { MainLocation } from "@/data/nzLocations";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { readApiResponse } from "@/lib/api/client";
import { useLanguage } from "@/components/LanguageProvider";
import { readListingViewPreference, saveListingViewPreference, type ListingViewMode } from "@/lib/market/listing-view-preference";

const quickCategories = marketplaceCategories.slice(0, 6).map(({ label, value }) => ({ label, value }));
const priceFilterMaximum = 5000;
const conditionFilters = ["all", "brand_new", "like_new", "excellent", "good", "fair"] as const;

export function MarketPageClient({ shopType = "secondhand", basePath = "/market", postedListings = [], savedListingIds = [], nextCursor = null }: { shopType?: Extract<ShopType, "all" | "secondhand">; basePath?: string; postedListings?: Listing[]; savedListingIds?: string[]; nextCursor?: string | null }) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearchQuery = searchParams.get("q") ?? "";
  const selectedCategory = searchParams.get("category") ?? "all";
  const selectedSubcategory = searchParams.get("subcategory") ?? "all";
  const appliedMaxPrice = Number(searchParams.get("maxPrice")) || priceFilterMaximum;
  const appliedCondition = conditionFilters.includes(searchParams.get("condition") as typeof conditionFilters[number]) ? searchParams.get("condition")! : "all";
  const [viewMode, setViewMode] = useState<ListingViewMode>("grid");
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
      router.replace(`${basePath}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [basePath, router, searchParams, searchQuery, urlSearchQuery]);

  useEffect(() => {
    if (searchParams.get("filters") !== "open") return;

    setIsFilterOpen(true);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("filters");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${basePath}?${nextQuery}` : basePath, { scroll: false });
  }, [basePath, router, searchParams]);

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
      setViewMode(readListingViewPreference() ?? (window.innerWidth < 1024 ? "list" : "grid"));

      if (window.innerWidth >= 768) {
        setIsFilterOpen(false);
      }
    };

    setResponsiveView();
    window.addEventListener("resize", setResponsiveView);
    return () => window.removeEventListener("resize", setResponsiveView);
  }, []);

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

  const chooseView = (mode: ListingViewMode) => {
    setViewMode(mode);
    saveListingViewPreference(mode);
  };
  const chooseCategory = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    params.delete("subcategory");
    if (categorySlug === "all") params.delete("category");
    else params.set("category", categorySlug);
    router.push(`${basePath}${params.size ? `?${params.toString()}` : ""}`);
    setIsFilterOpen(false);
  };
  const chooseSubcategory = (subcategorySlug: string) => {
    if (selectedCategory === "all") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    if (subcategorySlug === "all") params.delete("subcategory");
    else params.set("subcategory", subcategorySlug);
    router.push(`${basePath}?${params.toString()}`);
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
    router.push(`${basePath}${params.size ? `?${params.toString()}` : ""}`);
    setIsFilterOpen(false);
  };
  const applyLocationFilter = (nextMainLocation: MainLocation | "", nextSubLocation = "") => {
    setMainLocation(nextMainLocation);
    setSubLocation(nextSubLocation);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    if (nextMainLocation) params.set("mainLocation", nextMainLocation); else params.delete("mainLocation");
    if (nextSubLocation) params.set("subLocation", nextSubLocation); else params.delete("subLocation");
    router.push(`${basePath}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  };
  const changeSort = (nextSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    if (nextSort === "newest") params.delete("sort"); else params.set("sort", nextSort);
    router.push(`${basePath}${params.size ? `?${params.toString()}` : ""}`);
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
        <button className="filter-close-button" type="button" aria-label="Close marketplace filters" onClick={() => setIsFilterOpen(false)}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
        <MarketFilterSidebar
          activeShopType={shopType}
          activeCategory={selectedCategory}
          onCategorySelect={chooseCategory}
          mainLocation={mainLocation}
          subLocation={subLocation}
          onLocationChange={applyLocationFilter}
          priceCondition={{ maxPrice, condition, onMaxPriceChange: setMaxPrice, onConditionChange: setCondition, onApply: applyFilters }}
        />
      </MobileDrawer>
      {isDashboardDrawerOpen && <MobileDrawerBackdrop open onClose={() => window.dispatchEvent(new Event(mobileDrawerEvents.dashboardClose))} ariaLabel="Close dashboard menu" className="mobile-dashboard-backdrop mobile-dashboard-content-backdrop" />}

      <section className="market-results" aria-label="Fresh finds" aria-busy={Boolean(applyingChip)}>
        <MarketResultsToolbar
          viewMode={viewMode}
          onViewModeChange={chooseView}
          chips={toolbarCategories}
          activeChipValue={selectedCategoryDefinition ? selectedSubcategory : selectedCategory}
          applyingChip={applyingChip}
          onChipSelect={chooseToolbarCategory}
          sortValue={searchParams.get("sort") ?? "newest"}
          onSortChange={changeSort}
        />

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
