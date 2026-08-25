"use client";

import { mobileDrawerClasses } from "@/components/MobileDrawer";
import { BrowseFilterSidebar } from "@/components/layout/BrowseFilterSidebar";
import { LocationFilterSection } from "@/components/ui/LocationFilterSection";
import { type MainLocation } from "@/data/nzLocations";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";

export type CommunityCategory =
  | "all"
  | "local-noticeboard"
  | "events"
  | "qna"
  | "recommendations"
  | "together"
  | "immigration"
  | "free-board";

export const communityCategories: Array<{ value: CommunityCategory; labelKey: TranslationKey; icon: string }> = [
  { value: "all", labelKey: "all", icon: "ti-layout-grid" },
  { value: "qna", labelKey: "communityCategoryQnA", icon: "ti-help-circle" },
  { value: "free-board", labelKey: "communityCategoryFreeBoard", icon: "ti-messages" },
  { value: "local-noticeboard", labelKey: "communityCategoryLocalNoticeboard", icon: "ti-speakerphone" },
  { value: "events", labelKey: "communityCategoryEvents", icon: "ti-calendar-event" },
  { value: "recommendations", labelKey: "communityCategoryRecommendations", icon: "ti-thumb-up" },
  { value: "together", labelKey: "communityCategoryTogether", icon: "ti-users-group" },
  { value: "immigration", labelKey: "communityCategoryImmigration", icon: "ti-plane-departure" },
];

// This is the single category catalogue used by both community browsing and
// publishing.  The database migration seeds the same stable slugs, while the
// labels remain localisable at the UI boundary.
export const communityPostCategories = communityCategories.filter(
  (category): category is (typeof communityCategories)[number] & { value: Exclude<CommunityCategory, "all"> } => category.value !== "all",
);

export type CommunityFilterSidebarProps = {
  activeCategory: CommunityCategory;
  onCategorySelect: (category: CommunityCategory) => void;
  mainLocation: MainLocation | "";
  subLocation: string;
  onLocationChange: (mainLocation: MainLocation | "", subLocation?: string) => void;
};

export function CommunityFilterSidebar({ activeCategory, onCategorySelect, mainLocation, subLocation, onLocationChange }: CommunityFilterSidebarProps) {
  const { t } = useLanguage();

  return <BrowseFilterSidebar location={
    <LocationFilterSection title={t("location")} mainLocation={mainLocation} subLocation={subLocation} onLocationChange={onLocationChange} idPrefix="community" mainLocationLabel="Main Location" subLocationLabel="Sub Location" mainLocationPlaceholder="All New Zealand" subLocationPlaceholder="Any sub location" />
  }>

    <section className="filter-block community-category-filter">
      <h2>{t("categories")}</h2>
      <div className="filter-list community-category-list">
        {communityCategories.map(({ value, labelKey, icon }) => {
          return <button key={value} type="button" className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} community-category-${value} ${activeCategory === value ? "is-selected" : ""}`} onClick={() => onCategorySelect(value)}>
            <span className="community-category-illustration"><i className={`ti ${icon}`} aria-hidden="true" /></span>
            <span className={mobileDrawerClasses.menuLabel}>{t(labelKey)}</span>
          </button>;
        })}
        <button type="button" className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} community-category-parenting`} onClick={() => onCategorySelect("together")}>
          <i className="ti ti-baby-carriage" aria-hidden="true" />
          <span className={mobileDrawerClasses.menuLabel}>{t("communityTogetherParenting")}</span>
        </button>
      </div>
    </section>
  </BrowseFilterSidebar>;
}
