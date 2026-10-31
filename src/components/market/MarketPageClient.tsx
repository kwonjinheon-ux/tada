"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MobileDrawerBackdrop, mobileDrawerEvents } from "@/components/MobileDrawer";
import { BrowseFilterDrawer } from "@/components/browse/BrowseFilterDrawer";
import { ProductCard } from "@/components/ProductCard";
import { AdSlot } from "@/components/advertising/AdSlot";
import { ListPagination } from "@/components/ui/ListPagination";
import { MarketFilterSidebar, marketShopTypes, type ShopType } from "@/components/market/MarketFilterSidebar";
import { MarketShopTypeRail } from "@/components/market/MarketShopTypeRail";
import { MarketBrowseIntro } from "@/components/market/MarketBrowseIntro";
import { BrowseResultsToolbar } from "@/components/browse/BrowseResultsToolbar";
import { marketSortOptions } from "@/lib/market/sort-options";
import { marketFeedResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import type { Listing } from "@/data/listings";
import type { MainLocation } from "@/data/nzLocations";
import { loadBrowserSupabaseClient } from "@/lib/supabase/load-client";
import { useProfileMainLocation } from "@/lib/market/useProfileMainLocation";
import { searchWithProfileArea } from "@/lib/market/starting-area";
import { useLanguage } from "@/components/LanguageProvider";
import { readListingViewPreference, saveListingViewPreference, type ListingViewMode } from "@/lib/market/listing-view-preference";

const priceFilterMaximum = 5000;
const conditionFilters = ["all", "brand_new", "like_new", "excellent", "good", "fair"] as const;
const FEED_CACHE_TTL_MS = 30_000;
// Fixed order, so the same filters always produce the same key no matter which
// control set them.
const FEED_PARAM_KEYS = ["q", "category", "subcategory", "maxPrice", "condition", "mainLocation", "subLocation", "sort"] as const;

type MarketFeedState = { listings: Listing[]; savedListingIds: string[]; page: number; totalPages: number };

/** The feed request a browse URL stands for; doubles as the cache key. */
function buildFeedQuery(search: string, shopType: ShopType) {
  const source = new URLSearchParams(search);
  const params = new URLSearchParams();
  for (const key of FEED_PARAM_KEYS) {
    const value = source.get(key)?.trim();
    if (value) params.set(key, value);
  }
  const requestedPage = Number(source.get("page"));
  params.set("page", String(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1));
  if (shopType === "all") params.set("shopType", "all");
  return params.toString();
}

export function MarketPageClient({ shopType = "secondhand", basePath = "/market", postedListings = [], savedListingIds = [], page = 1, totalPages = 1, profileLocationDefault }: { profileLocationDefault?: MainLocation | ""; page?: number; totalPages?: number; shopType?: Extract<ShopType, "all" | "secondhand">; basePath?: string; postedListings?: Listing[]; savedListingIds?: string[] }) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Filters rewrite the URL with history.pushState so the feed can be fetched
  // here instead of paying for an RSC navigation of a force-dynamic page. The
  // App Router does not observe that write, though, so useSearchParams keeps
  // returning the query the page was served with and everything derived from it
  // goes stale. The pushed query is held here until a real navigation (a router
  // call, or Back/Forward) makes the URL authoritative again.
  const [pushedSearch, setPushedSearch] = useState<string | null>(null);
  useEffect(() => { setPushedSearch(null); }, [searchParams]);
  useEffect(() => {
    const syncFromUrl = () => setPushedSearch(null);
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);
  // A visit with no area on the address starts on the profile's area. The server has
  // already drawn the page for it, so the screen says so from the first render and the
  // address bar catches up below; a later real navigation brings its own address.
  const urlSearch = searchParams.toString();
  const defaultedSearch = searchWithProfileArea(urlSearch, profileLocationDefault);
  const activeSearch = pushedSearch ?? defaultedSearch ?? urlSearch;
  const activeParams = useMemo(() => new URLSearchParams(activeSearch), [activeSearch]);
  const urlSearchQuery = activeParams.get("q") ?? "";
  const selectedCategory = activeParams.get("category") ?? "all";
  const appliedMaxPrice = Number(activeParams.get("maxPrice")) || priceFilterMaximum;
  const appliedCondition = conditionFilters.includes(activeParams.get("condition") as typeof conditionFilters[number]) ? activeParams.get("condition")! : "all";
  const [viewMode, setViewMode] = useState<ListingViewMode>("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDashboardDrawerOpen, setIsDashboardDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [maxPrice, setMaxPrice] = useState(appliedMaxPrice);
  const [condition, setCondition] = useState(appliedCondition);
  const [mainLocation, setMainLocation] = useState<MainLocation | "">((activeParams.get("mainLocation") as MainLocation | null) ?? "");
  const [subLocation, setSubLocation] = useState(activeParams.get("subLocation") ?? "");
  const [feed, setFeed] = useState<MarketFeedState>({ listings: postedListings, savedListingIds, page, totalPages });
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [feedRevision, setFeedRevision] = useState(0);
  const feedCache = useRef(new Map<string, { feed: MarketFeedState; cachedAt: number }>());
  const savedListingIdSet = useMemo(() => new Set(feed.savedListingIds), [feed.savedListingIds]);
  const feedQuery = buildFeedQuery(activeSearch, shopType);
  const serverFeedQuery = buildFeedQuery(defaultedSearch ?? urlSearch, shopType);

  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  useEffect(() => {
    setMaxPrice(appliedMaxPrice);
    setCondition(appliedCondition);
  }, [appliedCondition, appliedMaxPrice]);

  useEffect(() => {
    setMainLocation((activeParams.get("mainLocation") as MainLocation | null) ?? "");
    setSubLocation(activeParams.get("subLocation") ?? "");
  }, [activeParams]);

  // The page already shipped the feed for its own URL, so it is cached under
  // that query and the first paint does not request it a second time. While a
  // pushed query is on screen the server props describe a different URL, so
  // they are only cached, never shown.
  useEffect(() => {
    const serverFeed: MarketFeedState = { listings: postedListings, savedListingIds, page, totalPages };
    feedCache.current.set(serverFeedQuery, { feed: serverFeed, cachedAt: Date.now() });
    setFeed((current) => (pushedSearch === null ? serverFeed : current));
  }, [page, postedListings, pushedSearch, savedListingIds, serverFeedQuery, totalPages]);

  useEffect(() => {
    const cached = feedCache.current.get(feedQuery);
    if (cached && Date.now() - cached.cachedAt < FEED_CACHE_TTL_MS) {
      setFeed(cached.feed);
      setIsLoadingListings(false);
      return;
    }
    const controller = new AbortController();
    setIsLoadingListings(true);
    // The listings already on screen stay until the new ones land, so changing
    // a filter does not blank the grid.
    void fetch(`/api/market/listings?${feedQuery}`, { signal: controller.signal })
      .then((response) => readApiResponse(response, marketFeedResponseSchema))
      .then((result) => {
        if (!result.data) return;
        const nextFeed: MarketFeedState = { listings: result.data.listings, savedListingIds: result.data.savedListingIds, page: result.data.page ?? 1, totalPages: result.data.totalPages ?? 1 };
        feedCache.current.set(feedQuery, { feed: nextFeed, cachedAt: Date.now() });
        setFeed(nextFeed);
      })
      .catch(() => undefined)
      .finally(() => { if (!controller.signal.aborted) setIsLoadingListings(false); });
    return () => controller.abort();
  }, [feedQuery, feedRevision]);

  useEffect(() => {
    const updateSearch = (event: Event) => setSearchQuery(typeof (event as CustomEvent<string>).detail === "string" ? (event as CustomEvent<string>).detail : "");
    window.addEventListener("market-search-query-change", updateSearch);
    return () => window.removeEventListener("market-search-query-change", updateSearch);
  }, []);

  /** Puts a filter change on the URL without asking the server for the page. */
  const applyBrowseParams = useCallback((params: URLSearchParams, { replace = false } = {}) => {
    const query = params.toString();
    const nextUrl = `${basePath}${query ? `?${query}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` === nextUrl) return;
    window.history[replace ? "replaceState" : "pushState"](window.history.state, "", nextUrl);
    setPushedSearch(query);
  }, [basePath]);
  /** The current URL's filters, ready to be amended. A filter change always
   *  lands on the first page: the page it was read from may not exist once the
   *  result count changes. */
  const nextBrowseParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("cursor");
    params.delete("page");
    return params;
  }, []);

  useEffect(() => {
    if (searchQuery === urlSearchQuery) return;
    const timer = window.setTimeout(() => {
      const params = nextBrowseParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim()); else params.delete("q");
      applyBrowseParams(params, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [applyBrowseParams, nextBrowseParams, searchQuery, urlSearchQuery]);

  useEffect(() => {
    if (searchParams.get("filters") !== "open") return;

    setIsFilterOpen(true);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("filters");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${basePath}?${nextQuery}` : basePath, { scroll: false });
  }, [basePath, router, searchParams]);

  useEffect(() => {
    let isMounted = true;
    let teardown: (() => void) | undefined;
    void loadBrowserSupabaseClient().then((supabase) => {
      if (!isMounted || !supabase) return;
      let refreshFrame: number | null = null;
      const channel = supabase
        .channel("market-listing-status-live")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_listings" }, () => {
          if (refreshFrame !== null) return;
          refreshFrame = window.requestAnimationFrame(() => {
            refreshFrame = null;
            // The feed is read here now, so a status change re-reads it instead
            // of re-rendering the route; a cached page would hide the update.
            feedCache.current.clear();
            setFeedRevision((revision) => revision + 1);
          });
        })
        .subscribe();
      teardown = () => {
        if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);
        void supabase.removeChannel(channel).catch(() => undefined);
      };
    }).catch(() => undefined);
    return () => {
      isMounted = false;
      teardown?.();
    };
  }, []);

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

  const chooseView = (mode: ListingViewMode) => {
    setViewMode(mode);
    saveListingViewPreference(mode);
  };
  const chooseCategory = (categorySlug: string) => {
    const params = nextBrowseParams();
    params.delete("subcategory");
    if (categorySlug === "all") params.delete("category");
    else params.set("category", categorySlug);
    applyBrowseParams(params);
    setIsFilterOpen(false);
  };
  const applyFilters = () => {
    const params = nextBrowseParams();
    if (maxPrice >= priceFilterMaximum) params.delete("maxPrice"); else params.set("maxPrice", String(maxPrice));
    if (condition === "all") params.delete("condition"); else params.set("condition", condition);
    if (mainLocation) params.set("mainLocation", mainLocation); else params.delete("mainLocation");
    if (subLocation) params.set("subLocation", subLocation); else params.delete("subLocation");
    applyBrowseParams(params);
    setIsFilterOpen(false);
  };
  const applyLocationFilter = (nextMainLocation: MainLocation | "", nextSubLocation = "", { replace = false } = {}) => {
    setMainLocation(nextMainLocation);
    setSubLocation(nextSubLocation);
    const params = nextBrowseParams();
    // Written even when empty: All New Zealand is a choice, and a URL that
    // simply omits the location is indistinguishable from a first visit, which
    // is when the signed-in profile area gets filled in.
    params.set("mainLocation", nextMainLocation);
    params.set("subLocation", nextSubLocation);
    applyBrowseParams(params, { replace });
  };
  useProfileMainLocation({
    // The server has already answered, with an area or with none. Asking again from the
    // browser is the second load this page used to make.
    enabled: profileLocationDefault === undefined,
    hasMainLocationInUrl: activeParams.has("mainLocation") || activeParams.has("subLocation"),
    mainLocation,
    // The profile default is not a choice the reader made, so it does not earn
    // its own history entry.
    onResolve: (profileMainLocation) => applyLocationFilter(profileMainLocation, subLocation, { replace: true }),
  });
  // The address still reads /market while the screen is on the profile's area, and every
  // filter built from the address bar would drop it. Writing it back changes no list: its
  // key is the one the server's list is cached under.
  useEffect(() => {
    if (!defaultedSearch || !profileLocationDefault) return;
    applyLocationFilter(profileLocationDefault, "", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const changeSort = (nextSort: string) => {
    const params = nextBrowseParams();
    if (nextSort === "newest") params.delete("sort"); else params.set("sort", nextSort);
    applyBrowseParams(params);
  };
  const chooseShopType = (nextShopType: ShopType) => {
    router.push(marketShopTypes.find(({ value }) => value === nextShopType)?.href ?? "/market");
  };
  return (
    <main className="marketplace-page market-page-with-bottom-dock">
      <BrowseFilterDrawer open={isFilterOpen} onOpenChange={setIsFilterOpen} openLabel={t("marketOpenFilters")} closeLabel={t("marketCloseFilters")}>
        <MarketFilterSidebar
          activeShopType={shopType}
          activeCategory={selectedCategory}
          onCategorySelect={chooseCategory}
          mainLocation={mainLocation}
          subLocation={subLocation}
          onLocationChange={applyLocationFilter}
          priceCondition={{ maxPrice, condition, onMaxPriceChange: setMaxPrice, onConditionChange: setCondition, onApply: applyFilters }}
        />
      </BrowseFilterDrawer>
      {isDashboardDrawerOpen && <MobileDrawerBackdrop open onClose={() => window.dispatchEvent(new Event(mobileDrawerEvents.dashboardClose))} ariaLabel="Close dashboard menu" className="mobile-dashboard-backdrop mobile-dashboard-content-backdrop" />}

      <section className="market-results" aria-label={t("marketFreshFinds")} aria-busy={isLoadingListings}>
        <MarketBrowseIntro shopType={shopType} />

        <MarketShopTypeRail activeShopType={shopType} onShopTypeSelect={chooseShopType} />

        <BrowseResultsToolbar
          viewMode={viewMode}
          onViewModeChange={chooseView}
          sortValue={activeParams.get("sort") ?? "newest"}
          sortOptions={marketSortOptions(t)}
          onSortChange={changeSort}
          sortDisplay="chips"
          resultsLabel={locale === "ko" ? `${feed.listings.length}개 매물` : `${feed.listings.length} ${feed.listings.length === 1 ? "listing" : "listings"}`}
        />

        <AdSlot placement="market_top" />

        {feed.listings.length ? <div className={`product-grid market-listings-grid ${viewMode === "list" ? "is-list-view" : ""}`}>
          {feed.listings.flatMap((listing, index) => [
            <ProductCard key={listing.id} listing={listing} priority={index === 0} initialIsSaved={savedListingIdSet.has(listing.id)} />,
            (index === 7 || (index > 7 && (index - 7) % 12 === 0)) ? <AdSlot key={`ad-${listing.id}`} placement={urlSearchQuery ? "search_feed" : "market_feed"} /> : null,
          ])}
        </div> : isLoadingListings ? null : <div className="market-search-empty" role="status"><i className="ms ms-search" aria-hidden="true" /><strong>{t("noMatchingListings")}</strong><span>{t("tryDifferentSearch")}</span></div>}

        <ListPagination page={feed.page} totalPages={feed.totalPages} label={t("marketListingPages")} search={activeSearch} />
      </section>
    </main>
  );
}
