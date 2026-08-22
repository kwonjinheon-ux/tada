"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import type { ListingViewMode } from "@/lib/market/listing-view-preference";

export type BrowseToolbarChip = {
  value: string;
  label: string;
  /** Extra class for chips that carry their own colour, e.g. market-type-*. */
  className?: string;
};

export type BrowseSortOption = { value: string; label: string };

export type BrowseResultsToolbarProps = {
  viewMode: ListingViewMode;
  onViewModeChange: (mode: ListingViewMode) => void;
  showViewToggle?: boolean;
  chips?: BrowseToolbarChip[];
  activeChipValue?: string;
  applyingChip?: string | null;
  onChipSelect?: (value: string) => void;
  sortValue?: string;
  sortOptions?: BrowseSortOption[];
  onSortChange?: (value: string) => void;
  sortDisplay?: "select" | "chips";
  resultsLabel?: string;
};

/**
 * The one results toolbar for every browse surface: view toggle, result count,
 * sort, and the quick filter chips. Each surface supplies its own chips and
 * sort options; the layout and interaction stay identical across them.
 */
export function BrowseResultsToolbar({
  viewMode,
  onViewModeChange,
  showViewToggle = true,
  chips = [],
  activeChipValue,
  applyingChip,
  onChipSelect,
  sortValue,
  sortOptions,
  onSortChange,
  sortDisplay = "select",
  resultsLabel,
}: BrowseResultsToolbarProps) {
  const { t } = useLanguage();
  const [clickedSort, setClickedSort] = useState<string | null>(null);
  const showSort = Boolean(sortOptions?.length && onSortChange);

  const chooseSort = (value: string) => {
    setClickedSort(value);
    window.setTimeout(() => setClickedSort(null), 420);
    onSortChange?.(value);
  };

  return <div className="market-toolbar">
    <div className="market-toolbar-top">
      {showViewToggle ? <div className="view-toggle" aria-label={t("viewMode")}>
        <button className={viewMode === "list" ? "is-selected" : ""} type="button" aria-label={t("listView")} aria-pressed={viewMode === "list"} onClick={() => onViewModeChange("list")}>
          <i className="fa-solid fa-list" aria-hidden="true" />
        </button>
        <button className={viewMode === "grid" ? "is-selected" : ""} type="button" aria-label={t("gridView")} aria-pressed={viewMode === "grid"} onClick={() => onViewModeChange("grid")}>
          <i className="fa-solid fa-border-all" aria-hidden="true" />
        </button>
      </div> : null}

      {chips.length ? <div className="market-chip-row" aria-label={t("quickCategories")}>
        {chips.map((chip) => {
          const isSelected = chip.value === activeChipValue;
          return <button
            key={chip.value}
            className={[chip.className, isSelected ? "is-selected" : "", applyingChip === chip.value ? "is-applying" : ""].filter(Boolean).join(" ")}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChipSelect?.(chip.value)}
          >
            {chip.label}
          </button>;
        })}
      </div> : null}

      {resultsLabel || (showSort && sortDisplay === "select") ? <div className="market-tools">
        {resultsLabel ? <p>{resultsLabel}</p> : null}
        {showSort && sortDisplay === "select" ? <label className="sort-control" aria-label={t("sortListings")}>
          <select value={sortValue} onChange={(event) => onSortChange?.(event.target.value)}>
            {sortOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label> : null}
      </div> : null}

      {showSort && sortDisplay === "chips" ? <div className="market-sort-chip-row" role="tablist" aria-label={t("sortListings")}>
        {sortOptions?.map((option) => {
          const isSelected = option.value === sortValue;
          return <button key={option.value} className={`sort-${option.value}${isSelected ? " is-selected" : ""}${clickedSort === option.value ? " is-clicking" : ""}`} type="button" role="tab" aria-selected={isSelected} onClick={() => chooseSort(option.value)}>{option.label}</button>;
        })}
      </div> : null}
    </div>
  </div>;
}
