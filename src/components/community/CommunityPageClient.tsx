"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
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

export function CommunityPageClient({ initialCategory = "all", initialFeed = null, initialFeedQuery }: { initialCategory?: CommunityCategory; initialFeed?: CommunityFeedResult | null; initialFeedQuery?: Parameters<typeof buildFeedCacheKey>[0] }) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim().slice(0, 60) ?? "";
  const searchBy = searchParams.get("searchBy") ?? "all";
  const requestedCategory = searchParams.get("category");
  const urlCategory = communityCategories.some(({ value }) => value === requestedCategory) ? requestedCategory as CommunityCategory : "all";
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ListingViewMode>("list");
  const resultsRef = useRef<HTMLElement>(null);
  // Choosing a category rewrites the URL with history.pushState so the feed can
  // be fetched here instead of paying for an RSC navigation of a force-dynamic
  // page. The App Router does not observe that write, though, so useSearchParams
  // keeps returning the old query and everything derived from it goes stale —
  // the category never loaded. The choice is held here until a real navigation
  // (a router call, or Back/Forward) makes the URL authoritative again.
  const [selection, setSelection] = useState<{ category: CommunityCategory; sort?: "recent" | "trending" } | null>(null);
  useEffect(() => { setSelection(null); }, [searchParams]);
  useEffect(() => {
    const syncFromUrl = () => setSelection(null);
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);
  const urlSort = searchParams.get("sort");
  const activeCategory = selection?.category ?? urlCategory;
  const activeSort = selection ? selection.sort : urlSort === "recent" || urlSort === "trending" ? urlSort : undefined;
  const activeChip = activeSort ?? (activeCategory === "recommendations" ? "recommendations" : "all");
  // The query actually on screen, which the pushed-URL writes above have made
  // the router unaware of. Pagination links are built from it so they keep the
  // category being read rather than the one the page was served with.
  const activeSearch = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!selection) return params.toString();
    params.delete("page");
    if (selection.sort) params.set("sort", selection.sort); else params.delete("sort");
    if (selection.category === "all") params.delete("category"); else params.set("category", selection.category);
    return params.toString();
  }, [searchParams, selection]);
  const requestedLocation = searchParams.get("mainLocation");
  const mainLocation: MainLocation | "" = NZ_MAIN_LOCATIONS.find((location) => location === requestedLocation) ?? "";
  const subLocation = searchParams.get("subLocation") ?? "";
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
  const chooseLocation = (nextMainLocation: MainLocation | "", nextSubLocation = "", isProfileDefault = false) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    // An explicit empty value preserves "All New Zealand" across navigation.
    params.set("mainLocation", nextMainLocation);
    if (isProfileDefault) params.delete("subLocation");
    else params.set("subLocation", nextSubLocation);
    router.replace(`/community${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  };
  useProfileMainLocation({
    hasMainLocationInUrl: searchParams.has("mainLocation") || searchParams.has("subLocation"),
    mainLocation,
    onResolve: (location) => chooseLocation(location, "", true),
  });
  const updateCategoryUrl = (category: CommunityCategory, sort?: "recent" | "trending") => {
    const params = new URLSearchParams(window.location.search);
    params.delete("page");
    if (sort) params.set("sort", sort);
    else params.delete("sort");
    if (category === "all") params.delete("category");
    else params.set("category", category);
    const query = params.toString();
    const nextUrl = `/community${query ? `?${query}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` === nextUrl) return;

    const nextPage = 1;
    const nextSearch = params.get("q")?.trim().slice(0, 60) ?? "";
    const nextSearchBy = params.get("searchBy") ?? "all";
    const nextMainLocation = params.get("mainLocation") ?? "";
    const nextSubLocation = params.get("subLocation") ?? "";
    const nextSort = sort;
    const cacheKey = buildFeedCacheKey({ category, search: nextSearch, searchBy: nextSearchBy, mainLocation: nextMainLocation, subLocation: nextSubLocation, sort: nextSort, page: nextPage });
    const cachedFeed = postFeedCache.current.get(cacheKey);

    window.history.pushState(window.history.state, "", nextUrl);
    setSelection({ category, sort });
    if (cachedFeed && Date.now() - cachedFeed.cachedAt < POST_FEED_CACHE_TTL_MS) {
      setFeed(cachedFeed.feed);
      setIsLoadingPosts(false);
    } else {
      setFeed({ posts: [], totalCount: 0, page: 1, totalPages: 1 });
      setIsLoadingPosts(true);
    }
  };
  const chooseCategory = (category: CommunityCategory) => {
    updateCategoryUrl(category);
    setIsFilterOpen(false);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const chooseChip = (chip: string) => {
    const category = chip === "recommendations" ? "recommendations" : "all";
    updateCategoryUrl(category, chip === "recent" || chip === "trending" ? chip : undefined);
  };

  useEffect(() => {
    const stored = readListingViewPreference("community");
    if (stored) setViewMode(stored);
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

      <CommunityRecentPostsPanel category={activeCategory} mainLocation={searchParams.has("mainLocation") ? mainLocation : undefined} subLocation={searchParams.has("subLocation") ? subLocation : undefined} />
    </main>
  );
}
