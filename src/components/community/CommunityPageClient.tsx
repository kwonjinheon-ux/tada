"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { BrowseFilterDrawer } from "@/components/browse/BrowseFilterDrawer";
import { MobileBrowseCategoryRail } from "@/components/browse/MobileBrowseCategoryRail";
import { CommunityBrowseIntro } from "@/components/community/CommunityBrowseIntro";
import { CommunityFilterSidebar, communityCategories, type CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { BrowseResultsToolbar } from "@/components/browse/BrowseResultsToolbar";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { CommunityPostListSkeleton } from "@/components/community/CommunityPostListSkeleton";
import { CommunityRecentPostsPanel } from "@/components/community/CommunityRecentPostsPanel";
import { NZ_MAIN_LOCATIONS, type MainLocation } from "@/data/nzLocations";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";
import { readListingViewPreference, saveListingViewPreference, type ListingViewMode } from "@/lib/market/listing-view-preference";
import { communityPostFeedResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import { ListPagination } from "@/components/ui/ListPagination";
import { ListSearchField } from "@/components/ui/ListSearchField";
import type { CommunityFeedResult } from "@/lib/community/post-feed";
import { useProfileMainLocation } from "@/lib/market/useProfileMainLocation";
import { searchWithProfileArea } from "@/lib/market/starting-area";
import { scrollToListTop } from "@/lib/scroll-to-list-top";

const POST_FEED_CACHE_TTL_MS = 30_000;
const CommunityBlogPost = dynamic(() => import("@/components/community/CommunityBlogPost").then((module) => module.CommunityBlogPost));

const communityChips: Array<{ value: string; labelKey: TranslationKey }> = [
  { value: "all", labelKey: "all" },
  { value: "trending", labelKey: "communityChipTrending" },
  { value: "recent", labelKey: "communityChipRecent" },
  { value: "recommendations", labelKey: "communityCategoryRecommendations" },
];

const buildFeedCacheKey = ({ category, search, searchBy, mainLocation, subLocation, sort, page }: { category: CommunityCategory; search: string; searchBy: string; mainLocation: string; subLocation: string; page: number; sort?: "recent" | "trending" }) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (category !== "all") params.set("category", category);
  if (search) params.set("q", search);
  if (searchBy !== "all") params.set("searchBy", searchBy);
  if (mainLocation) params.set("mainLocation", mainLocation);
  if (subLocation) params.set("subLocation", subLocation);
  if (sort) params.set("sort", sort);
  return params.toString();
};

export function CommunityPageClient({ initialCategory = "all", initialFeed = null, initialFeedQuery, profileLocationDefault }: { initialCategory?: CommunityCategory; initialFeed?: CommunityFeedResult | null; initialFeedQuery?: Parameters<typeof buildFeedCacheKey>[0]; profileLocationDefault?: MainLocation | "" }) {
  const { t, locale } = useLanguage();
  const searchParams = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ListingViewMode>("list");
  const resultsRef = useRef<HTMLElement>(null);
  // A filter rewrites the URL with history.pushState so the feed can be fetched
  // here instead of paying for an RSC navigation of a force-dynamic page. The
  // App Router does not observe that write, though, so useSearchParams keeps
  // returning the query the page was served with and everything derived from it
  // goes stale — the category never loaded, and choosing a location afterwards
  // rebuilt the URL from the old query and dropped it. The pushed query is held
  // here until a real navigation (a router call, or Back/Forward) makes the URL
  // authoritative again.
  const [pushedSearch, setPushedSearch] = useState<string | null>(null);
  useEffect(() => { setPushedSearch(null); }, [searchParams]);
  useEffect(() => {
    const syncFromUrl = () => setPushedSearch(null);
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);
  // A visit with no area on the address starts on the profile's area. The server has
  // already drawn the page for it, so the screen says so from the first render rather
  // than after an effect; the address bar catches up below. A later real navigation
  // brings its own address, and one that names an area is the reader's own choice.
  const urlSearch = searchParams.toString();
  const defaultedSearch = searchWithProfileArea(urlSearch, profileLocationDefault);
  const activeSearch = pushedSearch ?? defaultedSearch ?? urlSearch;
  const activeParams = useMemo(() => new URLSearchParams(activeSearch), [activeSearch]);
  const searchQuery = activeParams.get("q")?.trim().slice(0, 60) ?? "";
  const searchBy = activeParams.get("searchBy") ?? "all";
  const requestedCategory = activeParams.get("category");
  const activeCategory = communityCategories.some(({ value }) => value === requestedCategory) ? requestedCategory as CommunityCategory : "all";
  const requestedPage = Number(activeParams.get("page") ?? "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const urlSort = activeParams.get("sort");
  const activeSort = urlSort === "recent" || urlSort === "trending" ? urlSort : undefined;
  const activeChip = activeSort ?? (activeCategory === "recommendations" ? "recommendations" : "all");
  const requestedLocation = activeParams.get("mainLocation");
  const mainLocation: MainLocation | "" = NZ_MAIN_LOCATIONS.find((location) => location === requestedLocation) ?? "";
  const subLocation = activeParams.get("subLocation") ?? "";
  const [feed, setFeed] = useState<CommunityFeedResult>(initialFeed ?? { posts: [], totalCount: 0, page: 1, totalPages: 1 });
  const [isLoadingPosts, setIsLoadingPosts] = useState(!initialFeed);
  // Seeding the cache with the server-rendered feed keeps the first paint from
  // firing a duplicate request for data the page already shipped.
  const postFeedCache = useRef(new Map<string, { feed: CommunityFeedResult; cachedAt: number }>(
    initialFeed ? [[buildFeedCacheKey({ category: initialCategory, search: searchQuery, searchBy, page, mainLocation, subLocation, sort: urlSort === "recent" || urlSort === "trending" ? urlSort : undefined }), { feed: initialFeed, cachedAt: Date.now() }]] : [],
  ));

  const chooseView = (mode: ListingViewMode) => {
    setViewMode(mode);
    saveListingViewPreference(mode, "community");
  };
  /** The cache key the feed effect will look up for a set of filters. */
  const feedCacheKeyFor = (params: URLSearchParams) => {
    const category = params.get("category");
    const sort = params.get("sort");
    const requested = Number(params.get("page") ?? "1");
    return buildFeedCacheKey({
      category: communityCategories.some(({ value }) => value === category) ? category as CommunityCategory : "all",
      search: params.get("q")?.trim().slice(0, 60) ?? "",
      searchBy: params.get("searchBy") ?? "all",
      mainLocation: params.get("mainLocation") ?? "",
      subLocation: params.get("subLocation") ?? "",
      sort: sort === "recent" || sort === "trending" ? sort : undefined,
      page: Number.isSafeInteger(requested) && requested > 0 ? requested : 1,
    });
  };
  /** Puts a filter change on the URL without asking the server for the page. */
  const applyBrowseParams = (params: URLSearchParams, { replace = false } = {}) => {
    const query = params.toString();
    const nextUrl = `/community${query ? `?${query}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` === nextUrl) return;

    window.history[replace ? "replaceState" : "pushState"](window.history.state, "", nextUrl);
    setPushedSearch(query);
    const cachedFeed = postFeedCache.current.get(feedCacheKeyFor(params));
    if (cachedFeed && Date.now() - cachedFeed.cachedAt < POST_FEED_CACHE_TTL_MS) {
      setFeed(cachedFeed.feed);
      setIsLoadingPosts(false);
    } else {
      setFeed({ posts: [], totalCount: 0, page: 1, totalPages: 1 });
      setIsLoadingPosts(true);
    }
  };
  /** The filters on screen, ready to be amended. Read from the address bar
   *  rather than the router, which has not seen the pushed writes. */
  const nextBrowseParams = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("page");
    return params;
  };
  const chooseLocation = (nextMainLocation: MainLocation | "", nextSubLocation = "", isProfileDefault = false) => {
    const params = nextBrowseParams();
    // An explicit empty value preserves "All New Zealand" across navigation:
    // a URL with no location at all is a first visit, which is when the
    // signed-in profile area gets filled in.
    params.set("mainLocation", nextMainLocation);
    if (isProfileDefault) params.delete("subLocation");
    else params.set("subLocation", nextSubLocation);
    // The profile default is not a choice the reader made, so it does not earn
    // its own history entry.
    applyBrowseParams(params, { replace: isProfileDefault });
  };
  useProfileMainLocation({
    // The server has already answered, either with an area or with none. Asking again
    // from the browser is the second round trip this page used to make.
    enabled: profileLocationDefault === undefined,
    hasMainLocationInUrl: activeParams.has("mainLocation") || activeParams.has("subLocation"),
    mainLocation,
    onResolve: (location) => chooseLocation(location, "", true),
  });
  const updateCategoryUrl = (category: CommunityCategory, sort?: "recent" | "trending") => {
    const params = nextBrowseParams();
    if (sort) params.set("sort", sort);
    else params.delete("sort");
    if (category === "all") params.delete("category");
    else params.set("category", category);
    applyBrowseParams(params);
  };
  const chooseCategory = (category: CommunityCategory) => {
    updateCategoryUrl(category);
    setIsFilterOpen(false);
    scrollToListTop(resultsRef.current);
  };
  const chooseChip = (chip: string) => {
    const category = chip === "recommendations" ? "recommendations" : "all";
    updateCategoryUrl(category, chip === "recent" || chip === "trending" ? chip : undefined);
  };

  useEffect(() => {
    const stored = readListingViewPreference("community");
    if (stored) setViewMode(stored);
  }, []);

  // The address still reads /community while the screen is on the profile's area, and
  // every filter built from the address bar would drop it. Writing it back changes no
  // feed: the key is the one the server's feed was cached under.
  useEffect(() => {
    if (!defaultedSearch || !profileLocationDefault) return;
    chooseLocation(profileLocationDefault, "", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Soft navigations deliver a new server feed. Seed its own query key before
  // the loading effect runs, so pagination/search do not fetch it a second time.
  useEffect(() => {
    if (initialFeed && initialFeedQuery) {
      postFeedCache.current.set(buildFeedCacheKey(initialFeedQuery), { feed: initialFeed, cachedAt: Date.now() });
    }
  }, [initialFeed, initialFeedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const sort = activeChip === "recent" || activeChip === "trending" ? activeChip : undefined;
    const cacheKey = buildFeedCacheKey({ category: activeCategory, search: searchQuery, searchBy, mainLocation, subLocation, sort, page });
    const cachedFeed = postFeedCache.current.get(cacheKey);
    if (cachedFeed && Date.now() - cachedFeed.cachedAt < POST_FEED_CACHE_TTL_MS) {
      setFeed(cachedFeed.feed);
      setIsLoadingPosts(false);
      return () => controller.abort();
    }
    setIsLoadingPosts(true);
    void fetch(`/api/community/posts?${cacheKey}`, { signal: controller.signal })
      .then((response) => readApiResponse(response, communityPostFeedResponseSchema))
      .then((result) => {
        if (result.data) {
          postFeedCache.current.set(cacheKey, { feed: result.data, cachedAt: Date.now() });
          setFeed(result.data);
        } else {
          setFeed({ posts: [], totalCount: 0, page: 1, totalPages: 1 });
        }
      })
      .catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setFeed({ posts: [], totalCount: 0, page: 1, totalPages: 1 }); })
      .finally(() => { if (!controller.signal.aborted) setIsLoadingPosts(false); });
    return () => controller.abort();
  }, [activeCategory, activeChip, mainLocation, searchQuery, searchBy, subLocation, page, initialFeed, initialFeedQuery]);

  const visiblePosts = feed.posts;

  useEffect(() => {
    const openFilters = (event: Event) => {
      const section = (event as CustomEvent<string | undefined>).detail;
      if (section === "community") setIsFilterOpen(true);
    };
    const closeFilters = () => setIsFilterOpen(false);
    window.addEventListener("mobile-category-menu-request", openFilters);
    window.addEventListener("mobile-category-menu-close", closeFilters);
    return () => {
      window.removeEventListener("mobile-category-menu-request", openFilters);
      window.removeEventListener("mobile-category-menu-close", closeFilters);
    };
  }, []);

  return (
    <main className="marketplace-page community-page">
      <BrowseFilterDrawer open={isFilterOpen} onOpenChange={setIsFilterOpen} openLabel="Open community filters" closeLabel="Close community filters">
        <CommunityFilterSidebar
          activeCategory={activeCategory}
          onCategorySelect={(category) => { chooseCategory(category); setIsFilterOpen(false); }}
          mainLocation={mainLocation}
          subLocation={subLocation}
          onLocationChange={chooseLocation}
        />
      </BrowseFilterDrawer>

      <section className="market-results community-results" aria-label="Community posts" ref={resultsRef}>
        <CommunityBrowseIntro category={activeCategory} />

        <MobileBrowseCategoryRail
          ariaLabel={t("categories")}
          className="community-mobile-category-rail"
          activeValue={activeCategory}
          onSelect={(value) => chooseCategory(value as CommunityCategory)}
          items={communityCategories.map(({ value, labelKey, icon }) => ({ value, label: t(labelKey), icon, tone: `community-category-${value}` }))}
        />

        <BrowseResultsToolbar
          viewMode={viewMode}
          onViewModeChange={chooseView}
          chips={communityChips.map(({ value, labelKey }) => ({ value, label: t(labelKey) }))}
          activeChipValue={activeChip}
          onChipSelect={chooseChip}
          chipStyle="sort"
          resultsLabel={`${feed.totalCount} ${t("communityPostsCount")}`}
        />

        {isLoadingPosts && visiblePosts.length === 0 ? <CommunityPostListSkeleton /> : visiblePosts.length ? <div className={`community-post-list ${viewMode === "grid" ? "is-grid-view" : ""}`}>
          {viewMode === "grid"
            ? visiblePosts.map((post) => <CommunityBlogPost key={post.id} post={post} showTypeBadge={false} />)
            : visiblePosts.map((post) => <CommunityPostCard key={post.id} post={post} showTypeBadge={false} href={activeCategory === "all" ? undefined : `/community/${post.id}?category=${activeCategory}`} />)}
        </div> : <CommunityEmptyState category={activeCategory} />}
        <div className="community-list-footer">
          <ListPagination page={feed.page} totalPages={feed.totalPages} label={locale === "ko" ? "커뮤니티 글 페이지" : "Community post pages"} search={activeSearch} />
          <ListSearchField
            placeholder={t("searchCommunity")}
            label={t("searchCommunity")}
            submitLabel={locale === "ko" ? "검색" : "Search"}
            scopes={locale === "ko" ? [
              { value: "all", label: "전체" }, { value: "id", label: "아이디" }, { value: "content", label: "내용" }, { value: "title", label: "제목" },
            ] : [
              { value: "all", label: "All" }, { value: "id", label: "User ID" }, { value: "content", label: "Content" }, { value: "title", label: "Title" },
            ]}
          />
        </div>
      </section>

      <CommunityRecentPostsPanel category={activeCategory} mainLocation={activeParams.has("mainLocation") ? mainLocation : undefined} subLocation={activeParams.has("subLocation") ? subLocation : undefined} />
    </main>
  );
}
