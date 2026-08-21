"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrowseFilterDrawer } from "@/components/browse/BrowseFilterDrawer";
import { CommunityFilterSidebar, type CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { BrowseResultsToolbar } from "@/components/browse/BrowseResultsToolbar";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { CommunityBlogPost } from "@/components/community/CommunityBlogPost";
import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { CommunityPostListSkeleton } from "@/components/community/CommunityPostListSkeleton";
import { CommunityRecentPostsPanel } from "@/components/community/CommunityRecentPostsPanel";
import type { CommunityPost } from "@/data/community-posts";
import type { MainLocation } from "@/data/nzLocations";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";
import { readListingViewPreference, saveListingViewPreference, type ListingViewMode } from "@/lib/market/listing-view-preference";
import { communityPostFeedResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";

const POST_FEED_CACHE_TTL_MS = 30_000;

const communityChips: Array<{ value: string; labelKey: TranslationKey }> = [
  { value: "all", labelKey: "all" },
  { value: "trending", labelKey: "communityChipTrending" },
  { value: "recent", labelKey: "communityChipRecent" },
  { value: "events", labelKey: "communityCategoryEvents" },
  { value: "questions", labelKey: "communityChipQuestions" },
  { value: "recommendations", labelKey: "communityCategoryRecommendations" },
  { value: "free", labelKey: "communityChipFree" },
  { value: "neighbours", labelKey: "communityChipNeighbours" },
];

const buildFeedCacheKey = ({ category, search, mainLocation, subLocation }: { category: CommunityCategory; search: string; mainLocation: string; subLocation: string }) => {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (search) params.set("q", search);
  if (mainLocation) params.set("mainLocation", mainLocation);
  if (subLocation) params.set("subLocation", subLocation);
  return params.toString();
};

export function CommunityPageClient({ initialCategory = "all", initialPosts = null }: { initialCategory?: CommunityCategory; initialPosts?: CommunityPost[] | null }) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim().slice(0, 60) ?? "";
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ListingViewMode>("list");
  const [activeCategory, setActiveCategory] = useState<CommunityCategory>(initialCategory);
  const [activeChip, setActiveChip] = useState("all");
  const [mainLocation, setMainLocation] = useState<MainLocation | "">("");
  const [subLocation, setSubLocation] = useState("");
  const [publishedPosts, setPublishedPosts] = useState<CommunityPost[]>(initialPosts ?? []);
  const [isLoadingPosts, setIsLoadingPosts] = useState(!initialPosts);
  // Seeding the cache with the server-rendered feed keeps the first paint from
  // firing a duplicate request for data the page already shipped.
  const postFeedCache = useRef(new Map<string, { posts: CommunityPost[]; cachedAt: number }>(
    initialPosts ? [[buildFeedCacheKey({ category: initialCategory, search: searchQuery, mainLocation: "", subLocation: "" }), { posts: initialPosts, cachedAt: Date.now() }]] : [],
  ));

  const chooseView = (mode: ListingViewMode) => {
    setViewMode(mode);
    saveListingViewPreference(mode, "community");
  };
  const chooseLocation = (nextMainLocation: MainLocation | "", nextSubLocation = "") => {
    setMainLocation(nextMainLocation);
    setSubLocation(nextSubLocation);
  };

  useEffect(() => {
    const stored = readListingViewPreference("community");
    if (stored) setViewMode(stored);
  }, []);

  // A soft navigation swaps the server-rendered category without remounting
  // this component, so the selection has to follow the URL rather than stay on
  // whatever it was mounted with. Reseeding the cache first lets the effect
  // below reuse the posts that arrived with the navigation.
  useEffect(() => {
    if (initialPosts) postFeedCache.current.set(buildFeedCacheKey({ category: initialCategory, search: searchQuery, mainLocation: "", subLocation: "" }), { posts: initialPosts, cachedAt: Date.now() });
    setActiveCategory(initialCategory);
  }, [initialCategory, initialPosts, searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const cacheKey = buildFeedCacheKey({ category: activeCategory, search: searchQuery, mainLocation, subLocation });
    const cachedFeed = postFeedCache.current.get(cacheKey);
    if (cachedFeed && Date.now() - cachedFeed.cachedAt < POST_FEED_CACHE_TTL_MS) {
      setPublishedPosts(cachedFeed.posts);
      setIsLoadingPosts(false);
      return () => controller.abort();
    }
    setIsLoadingPosts(true);
    void fetch(`/api/community/posts?${cacheKey}`, { signal: controller.signal })
      .then((response) => readApiResponse(response, communityPostFeedResponseSchema))
      .then((result) => {
        if (result.data) {
          postFeedCache.current.set(cacheKey, { posts: result.data.posts, cachedAt: Date.now() });
          setPublishedPosts(result.data.posts);
        } else {
          setPublishedPosts([]);
        }
      })
      .catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setPublishedPosts([]); })
      .finally(() => { if (!controller.signal.aborted) setIsLoadingPosts(false); });
    return () => controller.abort();
  }, [activeCategory, mainLocation, searchQuery, subLocation]);

  const visiblePosts = publishedPosts;

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
          onCategorySelect={(category) => { setActiveCategory(category); setIsFilterOpen(false); }}
          mainLocation={mainLocation}
          subLocation={subLocation}
          onLocationChange={chooseLocation}
        />
      </BrowseFilterDrawer>

      <section className="market-results community-results" aria-label="Community posts">
        <div className="browse-intro">
          <h1>{t("communityIntroTitle")}</h1>
          <p>{t("communityIntroDescription")}</p>
        </div>

        <BrowseResultsToolbar
          viewMode={viewMode}
          onViewModeChange={chooseView}
          chips={communityChips.map(({ value, labelKey }) => ({ value, label: t(labelKey) }))}
          activeChipValue={activeChip}
          onChipSelect={setActiveChip}
          resultsLabel={`${visiblePosts.length} ${t("communityPostsCount")}`}
        />

        {isLoadingPosts && visiblePosts.length === 0 ? <CommunityPostListSkeleton /> : visiblePosts.length ? <div className={`community-post-list ${viewMode === "grid" ? "is-grid-view" : ""}`}>
          {viewMode === "grid"
            ? visiblePosts.map((post) => <CommunityBlogPost key={post.id} post={post} showTypeBadge={false} />)
            : visiblePosts.map((post) => <CommunityPostCard key={post.id} post={post} showTypeBadge={false} href={activeCategory === "all" ? undefined : `/community/${post.id}?category=${activeCategory}`} />)}
        </div> : <CommunityEmptyState />}
      </section>

      <CommunityRecentPostsPanel category={activeCategory} />
    </main>
  );
}
