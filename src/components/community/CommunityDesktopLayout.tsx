"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileDrawer } from "@/components/MobileDrawer";
import { CommunityFilterSidebar, type CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { CommunityRecentPostsPanel } from "@/components/community/CommunityRecentPostsPanel";
import type { MainLocation } from "@/data/nzLocations";

type CommunityDesktopLayoutProps = {
  children: ReactNode;
  activeCategory?: CommunityCategory;
};

// Keeps every desktop community surface on the same browse-grid: filters,
// content column, and recent-post rail. The rail is intentionally hidden by
// the existing responsive styles below desktop sizes.
export function CommunityDesktopLayout({ children, activeCategory = "all" }: CommunityDesktopLayoutProps) {
  const router = useRouter();
  const [mainLocation, setMainLocation] = useState<MainLocation | "">("");
  const [subLocation, setSubLocation] = useState("");
  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);

  const chooseCategory = (category: CommunityCategory) => {
    const query = category === "all" ? "" : `?category=${encodeURIComponent(category)}`;
    router.push(`/community${query}`);
  };

  useEffect(() => {
    const openCategories = (event: Event) => {
      if ((event as CustomEvent<string | undefined>).detail === "community") setIsMobileCategoryOpen(true);
    };
    const closeCategories = () => setIsMobileCategoryOpen(false);
    window.addEventListener("mobile-category-menu-request", openCategories);
    window.addEventListener("mobile-category-menu-close", closeCategories);
    return () => {
      window.removeEventListener("mobile-category-menu-request", openCategories);
      window.removeEventListener("mobile-category-menu-close", closeCategories);
    };
  }, []);

  return (
    <main className="marketplace-page community-page community-desktop-layout">
      <MobileDrawer open={isMobileCategoryOpen} onClose={() => setIsMobileCategoryOpen(false)} ariaLabel="Close community categories" className="filter-backdrop" panelClassName="market-filter-panel">
        <button className="filter-close-button" type="button" aria-label="Close community categories" onClick={() => setIsMobileCategoryOpen(false)}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
        <CommunityFilterSidebar
          activeCategory={activeCategory}
          onCategorySelect={(category) => { setIsMobileCategoryOpen(false); chooseCategory(category); }}
          mainLocation={mainLocation}
          subLocation={subLocation}
          onLocationChange={(nextMainLocation, nextSubLocation = "") => {
            setMainLocation(nextMainLocation);
            setSubLocation(nextSubLocation);
          }}
        />
      </MobileDrawer>
      <aside className="market-filter-panel community-desktop-filter-panel" aria-label="Community filters">
        <CommunityFilterSidebar
          activeCategory={activeCategory}
          onCategorySelect={chooseCategory}
          mainLocation={mainLocation}
          subLocation={subLocation}
          onLocationChange={(nextMainLocation, nextSubLocation = "") => {
            setMainLocation(nextMainLocation);
            setSubLocation(nextSubLocation);
          }}
        />
      </aside>
      <section className="market-results community-results community-desktop-main">{children}</section>
      <CommunityRecentPostsPanel category={activeCategory} />
    </main>
  );
}
