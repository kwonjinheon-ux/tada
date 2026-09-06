"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrowseFilterDrawer } from "@/components/browse/BrowseFilterDrawer";
import { MarketFilterSidebar } from "@/components/market/MarketFilterSidebar";
import { type MainLocation } from "@/data/nzLocations";

/**
 * Listing detail inside the Market browse shell, so the rail stays put when a
 * listing is opened from the feed instead of the page losing its navigation.
 *
 * The rail filters a feed, and detail has no feed to filter, so every control
 * navigates back to /market carrying the choice. The rail is desktop-only —
 * below 1024px the detail page needs its full width, and a filter button on a
 * page with nothing to filter is noise.
 */
export function MarketDetailShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const browse = (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    router.push(query ? `/market?${query}` : "/market");
  };

  return (
    <div className="market-theme market-detail-shell">
      <BrowseFilterDrawer open={isFilterOpen} onOpenChange={setIsFilterOpen} openLabel="Open marketplace filters" closeLabel="Close marketplace filters">
        <MarketFilterSidebar
          activeShopType="all"
          activeCategory="all"
          onCategorySelect={(categorySlug) => browse(categorySlug === "all" ? {} : { category: categorySlug })}
          mainLocation=""
          subLocation=""
          onLocationChange={(mainLocation: MainLocation | "", subLocation?: string) => browse({
            ...(mainLocation ? { mainLocation } : {}),
            ...(subLocation ? { subLocation } : {}),
          })}
        />
      </BrowseFilterDrawer>

      <div className="market-detail-shell-content">{children}</div>
    </div>
  );
}
