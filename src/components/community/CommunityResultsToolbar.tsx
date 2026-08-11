"use client";

import type { ListingViewMode } from "@/lib/market/listing-view-preference";

const chips = [
  { label: "All", value: "all" },
  { label: "Trending", value: "trending" },
  { label: "Recent", value: "recent" },
  { label: "Events", value: "events" },
  { label: "Questions", value: "questions" },
  { label: "Recommendations", value: "recommendations" },
  { label: "Free", value: "free" },
  { label: "Neighbours", value: "neighbours" },
];

export type CommunityResultsToolbarProps = {
  viewMode: ListingViewMode;
  onViewModeChange: (mode: ListingViewMode) => void;
  activeChipValue: string;
  onChipSelect: (value: string) => void;
  resultsLabel?: string;
};

export function CommunityResultsToolbar({ viewMode, onViewModeChange, activeChipValue, onChipSelect, resultsLabel }: CommunityResultsToolbarProps) {
  return <div className="market-toolbar">
    <div className="view-toggle" aria-label="View mode">
      <button className={viewMode === "list" ? "is-selected" : ""} type="button" aria-label="List view" aria-pressed={viewMode === "list"} onClick={() => onViewModeChange("list")}>
        <i className="fa-solid fa-list" aria-hidden="true" />
      </button>
      <button className={viewMode === "grid" ? "is-selected" : ""} type="button" aria-label="Grid view" aria-pressed={viewMode === "grid"} onClick={() => onViewModeChange("grid")}>
        <i className="fa-solid fa-border-all" aria-hidden="true" />
      </button>
    </div>

    <div className="market-chip-row" aria-label="Quick filters">
      {chips.map((chip) => {
        const isSelected = chip.value === activeChipValue;
        return <button key={chip.value} className={isSelected ? "is-selected" : ""} type="button" aria-pressed={isSelected} onClick={() => onChipSelect(chip.value)}>
          {chip.label}
        </button>;
      })}
    </div>

    {resultsLabel ? <div className="market-tools"><p>{resultsLabel}</p></div> : null}
  </div>;
}
