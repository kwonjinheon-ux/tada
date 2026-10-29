"use client";

import { BrowseFilterSidebar } from "@/components/layout/BrowseFilterSidebar";
import { FilterMenuSection } from "@/components/layout/FilterMenuSection";
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
  | "parents-kids"
  | "immigration"
  | "free-board";

export const communityCategories: Array<{ value: CommunityCategory; labelKey: TranslationKey; icon: string }> = [
  { value: "all", labelKey: "all", icon: "ms-grid-view" },
  { value: "free-board", labelKey: "communityCategoryFreeBoard", icon: "ms-forum" },
  { value: "qna", labelKey: "communityCategoryQnA", icon: "ms-help" },
  { value: "recommendations", labelKey: "communityCategoryRecommendations", icon: "ms-thumb-up" },
  { value: "local-noticeboard", labelKey: "communityCategoryLocalNoticeboard", icon: "ms-campaign" },
  { value: "immigration", labelKey: "communityCategoryImmigration", icon: "ms-flight-takeoff" },
  { value: "parents-kids", labelKey: "communityCategoryParenting", icon: "ms-stroller" },
  { value: "events", labelKey: "communityCategoryEvents", icon: "ms-event" },
  { value: "together", labelKey: "communityCategoryTogether", icon: "ms-groups" },
];

// This is the single category catalogue used by both community browsing and
// publishing.  The database migration seeds the same stable slugs, while the
// labels remain localisable at the UI boundary.
export const communityPostCategories = communityCategories.filter(
  (category): category is (typeof communityCategories)[number] & { value: Exclude<CommunityCategory, "all"> } => category.value !== "all",
);

export function communityCreateHref(category: string | null) {
  return communityPostCategories.some(({ value }) => value === category)
    ? `/community/create?category=${category}`
    : "/community/create";
}

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

    <FilterMenuSection
      title={t("categories")}
      className="community-category-filter"
      listClassName="community-category-list"
      itemClassPrefix="community-category"
      iconFrameClassName="community-category-illustration"
      activeValue={activeCategory}
      onSelect={onCategorySelect}
      items={communityCategories.map(({ value, labelKey, icon }) => ({ value, label: t(labelKey), icon }))}
    />
  </BrowseFilterSidebar>;
}
