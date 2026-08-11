"use client";

import { mobileDrawerClasses } from "@/components/MobileDrawer";
import { LocationFilterSection } from "@/components/ui/LocationFilterSection";
import { type MainLocation } from "@/data/nzLocations";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";

export type CommunityCategory =
  | "all"
  | "local-noticeboard"
  | "events"
  | "qna"
  | "recommendations"
  | "free-stuff"
  | "lost-found"
  | "parents-kids"
  | "jobs-services"
  | "housing-flatmates"
  | "study-language"
  | "clubs-meetups";

export const communityCategories: Array<{ value: CommunityCategory; labelKey: TranslationKey; icon: string }> = [
  { value: "all", labelKey: "all", icon: "fa-border-all" },
  { value: "local-noticeboard", labelKey: "communityCategoryLocalNoticeboard", icon: "fa-bullhorn" },
  { value: "events", labelKey: "communityCategoryEvents", icon: "fa-calendar-day" },
  { value: "qna", labelKey: "communityCategoryQnA", icon: "fa-circle-question" },
  { value: "recommendations", labelKey: "communityCategoryRecommendations", icon: "fa-thumbs-up" },
  { value: "free-stuff", labelKey: "communityCategoryFreeStuff", icon: "fa-gift" },
  { value: "lost-found", labelKey: "communityCategoryLostFound", icon: "fa-magnifying-glass" },
  { value: "parents-kids", labelKey: "communityCategoryParentsKids", icon: "fa-people-roof" },
  { value: "jobs-services", labelKey: "communityCategoryJobsServices", icon: "fa-briefcase" },
  { value: "housing-flatmates", labelKey: "communityCategoryHousingFlatmates", icon: "fa-house-chimney" },
  { value: "study-language", labelKey: "communityCategoryStudyLanguage", icon: "fa-graduation-cap" },
  { value: "clubs-meetups", labelKey: "communityCategoryClubsMeetups", icon: "fa-people-group" },
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

  return <>
    <LocationFilterSection title={t("location")} mainLocation={mainLocation} subLocation={subLocation} onLocationChange={onLocationChange} idPrefix="community" mainLocationLabel="Main Location" subLocationLabel="Sub Location" mainLocationPlaceholder="All New Zealand" subLocationPlaceholder="Any sub location" />

    <section className="filter-block community-category-filter">
      <h2>{t("categories")}</h2>
      <div className="filter-list community-category-list">
        {communityCategories.map(({ value, labelKey, icon }) => (
          <button key={value} type="button" className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} community-category-${value} ${activeCategory === value ? "is-selected" : ""}`} onClick={() => onCategorySelect(value)}>
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
            <span className={mobileDrawerClasses.menuLabel}>{t(labelKey)}</span>
          </button>
        ))}
      </div>
    </section>
  </>;
}
