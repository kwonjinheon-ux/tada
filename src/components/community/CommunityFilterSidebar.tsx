"use client";

import Image from "next/image";
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
  { value: "all", labelKey: "all", icon: "fa-border-all" },
  { value: "qna", labelKey: "communityCategoryQnA", icon: "fa-circle-question" },
  { value: "free-board", labelKey: "communityCategoryFreeBoard", icon: "fa-comments" },
  { value: "local-noticeboard", labelKey: "communityCategoryLocalNoticeboard", icon: "fa-bullhorn" },
  { value: "events", labelKey: "communityCategoryEvents", icon: "fa-calendar-day" },
  { value: "recommendations", labelKey: "communityCategoryRecommendations", icon: "fa-thumbs-up" },
  { value: "together", labelKey: "communityCategoryTogether", icon: "fa-people-group" },
  { value: "immigration", labelKey: "communityCategoryImmigration", icon: "fa-plane-departure" },
];

export const communityCategoryIllustrations: Record<CommunityCategory, string> = {
  all: "/images/community/categories/all.png",
  qna: "/images/community/categories/qna.png",
  "free-board": "/images/community/categories/free-board.png",
  "local-noticeboard": "/images/community/categories/local-noticeboard.png",
  events: "/images/community/categories/events.png",
  recommendations: "/images/community/categories/recommendations.png",
  together: "/images/community/categories/together.png",
  immigration: "/images/community/categories/immigration.png",
};

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
        {communityCategories.map(({ value, labelKey }) => {
          return <button key={value} type="button" className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} community-category-${value} ${activeCategory === value ? "is-selected" : ""}`} onClick={() => onCategorySelect(value)}>
            <span className="community-category-illustration"><Image src={communityCategoryIllustrations[value]} alt="" width={32} height={32} sizes="32px" /></span>
            <span className={mobileDrawerClasses.menuLabel}>{t(labelKey)}</span>
          </button>;
        })}
        <button type="button" className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} community-category-parenting`} onClick={() => onCategorySelect("together")}>
          <i className="fa-solid fa-baby" aria-hidden="true" />
          <span className={mobileDrawerClasses.menuLabel}>{t("communityTogetherParenting")}</span>
        </button>
      </div>
    </section>
  </BrowseFilterSidebar>;
}
