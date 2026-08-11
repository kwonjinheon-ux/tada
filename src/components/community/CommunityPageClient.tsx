"use client";

import { useState } from "react";
import { MobileDrawer } from "@/components/MobileDrawer";
import { CommunityFilterSidebar, type CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { CommunityResultsToolbar } from "@/components/community/CommunityResultsToolbar";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { communityPosts } from "@/data/community-posts";
import type { MainLocation } from "@/data/nzLocations";
import { readListingViewPreference, saveListingViewPreference, type ListingViewMode } from "@/lib/market/listing-view-preference";

export function CommunityPageClient() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ListingViewMode>(() => readListingViewPreference() ?? "list");
  const [activeCategory, setActiveCategory] = useState<CommunityCategory>("all");
  const [activeChip, setActiveChip] = useState("all");
  const [mainLocation, setMainLocation] = useState<MainLocation | "">("");
  const [subLocation, setSubLocation] = useState("");

  const chooseView = (mode: ListingViewMode) => {
    setViewMode(mode);
    saveListingViewPreference(mode);
  };
  const chooseLocation = (nextMainLocation: MainLocation | "", nextSubLocation = "") => {
    setMainLocation(nextMainLocation);
    setSubLocation(nextSubLocation);
  };

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
          resultsLabel={`${communityPosts.length} posts`}
        />

        <div className={`community-post-list ${viewMode === "grid" ? "is-grid-view" : ""}`}>
          {communityPosts.map((post) => <CommunityPostCard key={post.id} post={post} />)}
        </div>
      </section>
    </main>
  );
}
