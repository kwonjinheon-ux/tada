"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { CommunityFilterSidebar, type CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { CommunityRecentPostsPanel } from "@/components/community/CommunityRecentPostsPanel";
import type { CommunityPost } from "@/data/community-posts";
import type { MainLocation } from "@/data/nzLocations";

type CommunityDesktopLayoutProps = {
  children: ReactNode;
  activeCategory?: CommunityCategory;
  recentPosts?: CommunityPost[];
};

// Keeps every desktop community surface on the same browse-grid: filters,
// content column, and recent-post rail. The rail is intentionally hidden by
// the existing responsive styles below desktop sizes.
export function CommunityDesktopLayout({ children, activeCategory = "all", recentPosts }: CommunityDesktopLayoutProps) {
  const router = useRouter();
  const [mainLocation, setMainLocation] = useState<MainLocation | "">("");
  const [subLocation, setSubLocation] = useState("");

  const chooseCategory = (category: CommunityCategory) => {
    const query = category === "all" ? "" : `?category=${encodeURIComponent(category)}`;
    router.push(`/community${query}`);
  };

  return (
    <main className="marketplace-page community-page community-desktop-layout">
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
      <CommunityRecentPostsPanel posts={recentPosts} />
    </main>
  );
}
