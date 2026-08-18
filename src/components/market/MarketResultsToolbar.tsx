"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { ListingViewMode } from "@/lib/market/listing-view-preference";

export type MarketResultsToolbarProps = {
  viewMode: ListingViewMode;
  onViewModeChange: (mode: ListingViewMode) => void;
  chips?: Array<{ label: string; value: string }>;
  activeChipValue?: string;
  applyingChip?: string | null;
  onChipSelect?: (value: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  resultsLabel?: string;
};

export function MarketResultsToolbar({ viewMode, onViewModeChange, chips = [], activeChipValue, applyingChip, onChipSelect, sortValue, onSortChange, resultsLabel }: MarketResultsToolbarProps) {
  const { t } = useLanguage();

  return <div className="market-toolbar">
    <div className="market-toolbar-top">
      <div className="view-toggle" aria-label={t("viewMode")}>
        <button className={viewMode === "list" ? "is-selected" : ""} type="button" aria-label={t("listView")} aria-pressed={viewMode === "list"} onClick={() => onViewModeChange("list")}>
          <i className="fa-solid fa-list" aria-hidden="true" />
        </button>
        <button className={viewMode === "grid" ? "is-selected" : ""} type="button" aria-label={t("gridView")} aria-pressed={viewMode === "grid"} onClick={() => onViewModeChange("grid")}>
          <i className="fa-solid fa-border-all" aria-hidden="true" />
        </button>
      </div>

      <div className="market-tools">
        {resultsLabel ? <p>{resultsLabel}</p> : null}
        <label className="sort-control" aria-label={t("sortListings")}>
          <select value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
            <option value="newest">{t("newest")}</option>
            <option value="priceAsc">{t("lowToHigh")}</option>
            <option value="priceDesc">{t("highToLow")}</option>
          </select>
        </label>
      </div>
    </div>

    {chips.length ? <div className="market-chip-row" aria-label={t("quickCategories")}>
      {chips.map((chip) => {
        const isSelected = chip.value === activeChipValue;
        return <button
          key={chip.value}
          className={`market-type-${chip.value} ${isSelected ? "is-selected" : ""} ${applyingChip === chip.value ? "is-applying" : ""}`}
          type="button"
          aria-pressed={isSelected}
          onClick={() => onChipSelect?.(chip.value)}
        >
          {chip.label}
        </button>;
      })}
    </div> : null}

  </div>;
}
