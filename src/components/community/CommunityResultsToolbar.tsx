"use client";

import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";
import type { ListingViewMode } from "@/lib/market/listing-view-preference";

const chips: Array<{ labelKey: TranslationKey; value: string }> = [
  { labelKey: "all", value: "all" },
  { labelKey: "communityChipTrending", value: "trending" },
  { labelKey: "communityChipRecent", value: "recent" },
  { labelKey: "communityCategoryEvents", value: "events" },
  { labelKey: "communityChipQuestions", value: "questions" },
  { labelKey: "communityCategoryRecommendations", value: "recommendations" },
  { labelKey: "communityChipFree", value: "free" },
  { labelKey: "communityChipNeighbours", value: "neighbours" },
];

export type CommunityResultsToolbarProps = {
  viewMode: ListingViewMode;
  onViewModeChange: (mode: ListingViewMode) => void;
  activeChipValue: string;
  onChipSelect: (value: string) => void;
  resultsLabel?: string;
};

export function CommunityResultsToolbar({ viewMode, onViewModeChange, activeChipValue, onChipSelect, resultsLabel }: CommunityResultsToolbarProps) {
  const { t } = useLanguage();

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
          {t(chip.labelKey)}
        </button>;
      })}
    </div>

    {resultsLabel ? <div className="market-tools"><p>{resultsLabel}</p></div> : null}
  </div>;
}
