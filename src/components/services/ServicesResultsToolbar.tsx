"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { servicesText } from "@/data/services";
import type { ListingViewMode } from "@/lib/market/listing-view-preference";

export type ServicesResultsToolbarProps = {
  viewMode: ListingViewMode;
  onViewModeChange: (mode: ListingViewMode) => void;
  activeChipValue: string;
  onChipSelect: (value: string) => void;
  resultsLabel?: string;
};

// Mirrors the Market and Community toolbars so the three browse surfaces keep
// one control row; only the quick filters differ.
export function ServicesResultsToolbar({ viewMode, onViewModeChange, activeChipValue, onChipSelect, resultsLabel }: ServicesResultsToolbarProps) {
  const { t, locale } = useLanguage();
  const text = servicesText(locale);
  const chips = [
    { value: "all", label: t("all") },
    { value: "availableToday", label: text.quickFilters.availableToday },
    { value: "verified", label: text.quickFilters.verified },
    { value: "topRated", label: text.quickFilters.topRated },
    { value: "lowPrice", label: text.quickFilters.lowPrice },
    { value: "nearMe", label: text.quickFilters.nearMe },
  ];

  return <div className="market-toolbar">
    <div className="view-toggle" aria-label={t("viewMode")}>
      <button className={viewMode === "list" ? "is-selected" : ""} type="button" aria-label={t("listView")} aria-pressed={viewMode === "list"} onClick={() => onViewModeChange("list")}>
        <i className="fa-solid fa-list" aria-hidden="true" />
      </button>
      <button className={viewMode === "grid" ? "is-selected" : ""} type="button" aria-label={t("gridView")} aria-pressed={viewMode === "grid"} onClick={() => onViewModeChange("grid")}>
        <i className="fa-solid fa-border-all" aria-hidden="true" />
      </button>
    </div>

    <div className="market-chip-row" aria-label={t("quickCategories")}>
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
