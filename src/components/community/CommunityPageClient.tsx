"use client";

import { useEffect, useState } from "react";
import { MobileDrawer } from "@/components/MobileDrawer";
import { CommunityFilterSidebar, type CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { CommunityResultsToolbar } from "@/components/community/CommunityResultsToolbar";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { CommunityRecentPostsPanel } from "@/components/community/CommunityRecentPostsPanel";
import { communityPosts } from "@/data/community-posts";
import type { CommunityPost } from "@/data/community-posts";
import type { MainLocation } from "@/data/nzLocations";
import { useLanguage } from "@/components/LanguageProvider";
import { readListingViewPreference, saveListingViewPreference, type ListingViewMode } from "@/lib/market/listing-view-preference";
import { communityPostFeedResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import { DialogOverlay } from "@/components/ui/DialogOverlay";

export function CommunityPageClient() {
  const { t } = useLanguage();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ListingViewMode>("list");
  const [activeCategory, setActiveCategory] = useState<CommunityCategory>("all");
  const [activeChip, setActiveChip] = useState("all");
  const [mainLocation, setMainLocation] = useState<MainLocation | "">("");
  const [subLocation, setSubLocation] = useState("");
  const [publishedPosts, setPublishedPosts] = useState<CommunityPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  const chooseView = (mode: ListingViewMode) => {
    setViewMode(mode);
    saveListingViewPreference(mode);
  };
  const chooseLocation = (nextMainLocation: MainLocation | "", nextSubLocation = "") => {
    setMainLocation(nextMainLocation);
    setSubLocation(nextSubLocation);
  };

  useEffect(() => {
    const stored = readListingViewPreference();
    if (stored) setViewMode(stored);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (activeCategory !== "all") params.set("category", activeCategory);
    if (mainLocation) params.set("mainLocation", mainLocation);
    if (subLocation) params.set("subLocation", subLocation);
    void fetch(`/api/community/posts?${params.toString()}`, { signal: controller.signal })
      .then((response) => readApiResponse(response, communityPostFeedResponseSchema))
      .then((result) => { if (result.data) setPublishedPosts(result.data.posts); })
      .catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setPublishedPosts([]); });
    return () => controller.abort();
  }, [activeCategory, mainLocation, subLocation]);

  const visiblePosts = [...publishedPosts, ...communityPosts];

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
      <button
        className={`floating-filter-button ${isFilterOpen ? "is-open" : ""}`}
        type="button"
        aria-label={isFilterOpen ? "Close community filters" : "Open community filters"}
        aria-expanded={isFilterOpen}
        onClick={() => setIsFilterOpen((current) => !current)}
      >
        <i className="fa-solid fa-sliders filter-toggle-icon filter-toggle-icon-open" aria-hidden="true" />
        <i className="fa-solid fa-xmark filter-toggle-icon filter-toggle-icon-close" aria-hidden="true" />
      </button>

      <MobileDrawer open={isFilterOpen} onClose={() => setIsFilterOpen(false)} ariaLabel="Close community filters" className="filter-backdrop" panelClassName="market-filter-panel">
        <button className="filter-close-button" type="button" aria-label="Close community filters" onClick={() => setIsFilterOpen(false)}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
        <CommunityFilterSidebar
          activeCategory={activeCategory}
          onCategorySelect={(category) => { setActiveCategory(category); setIsFilterOpen(false); }}
          mainLocation={mainLocation}
          subLocation={subLocation}
          onLocationChange={chooseLocation}
        />
      </MobileDrawer>

      <section className="market-results community-results" aria-label="Community posts">
        <CommunityResultsToolbar
          viewMode={viewMode}
          onViewModeChange={chooseView}
          activeChipValue={activeChip}
          onChipSelect={setActiveChip}
          resultsLabel={`${visiblePosts.length} ${t("communityPostsCount")}`}
        />

        <div className={`community-post-list ${viewMode === "grid" ? "is-grid-view" : ""}`}>
          {visiblePosts.map((post) => <CommunityPostCard key={post.id} post={post} showTypeBadge={activeCategory === "all"} onOpen={() => setSelectedPost(post)} />)}
        </div>
      </section>

      <CommunityRecentPostsPanel posts={visiblePosts.slice(0, 4)} />
      {selectedPost ? <DialogOverlay className="community-post-dialog" onClose={() => setSelectedPost(null)} dismissHint="Click outside to close this post"><section className="post-ad-card"><button className="filter-close-button" type="button" aria-label="Close post" onClick={() => setSelectedPost(null)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button><span className={`community-post-badge community-post-badge-${selectedPost.type}`}>{t(`communityType${selectedPost.type === "question" ? "Question" : selectedPost.type === "event" ? "Event" : selectedPost.type === "recommendation" ? "Recommendation" : selectedPost.type === "notice" ? "Notice" : selectedPost.type === "housing" ? "Housing" : "Notice"}` as never)}</span><h1>{selectedPost.title}</h1><p>{selectedPost.excerpt.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}</p></section></DialogOverlay> : null}
    </main>
  );
}
