"use client";

import { useState, type ReactNode } from "react";
import { BrowseFilterDrawer } from "@/components/browse/BrowseFilterDrawer";
import { MarketFilterSidebar } from "@/components/market/MarketFilterSidebar";
import { type MainLocation } from "@/data/nzLocations";

/** Group Buy rides the Market browse shell rather than inventing one: the same
 *  filter rail, the same drawer, the same centre column. Group Buy is already a
 *  Market shop type, so a reader moving between the two should not notice the
 *  page changed underneath them. */
export function GroupBuyShell({ children }: { children: ReactNode }) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [mainLocation, setMainLocation] = useState<MainLocation | "">("");
  const [subLocation, setSubLocation] = useState("");

  return (
    <main className="marketplace-page market-page-with-bottom-dock groupbuy-shell">
      <BrowseFilterDrawer open={isFilterOpen} onOpenChange={setIsFilterOpen} openLabel="Open marketplace filters" closeLabel="Close marketplace filters">
        <MarketFilterSidebar
          activeShopType="groupbuy"
          activeCategory={category}
          onCategorySelect={(next) => { setCategory(next === category ? "" : next); setIsFilterOpen(false); }}
          mainLocation={mainLocation}
          subLocation={subLocation}
          onLocationChange={(nextMain, nextSub = "") => { setMainLocation(nextMain); setSubLocation(nextSub); }}
        />
      </BrowseFilterDrawer>
      {children}
    </main>
  );
}
