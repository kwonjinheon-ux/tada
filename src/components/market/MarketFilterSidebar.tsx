"use client";

import type { CSSProperties } from "react";
import { mobileDrawerClasses } from "@/components/MobileDrawer";
import { BrowseFilterSidebar } from "@/components/layout/BrowseFilterSidebar";
import { LocationFilterSection } from "@/components/ui/LocationFilterSection";
import { marketplaceCategories } from "@/data/marketplace-categories";
import { type MainLocation } from "@/data/nzLocations";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";

export type ShopType = "all" | "secondhand" | "garage-sale" | "moving-sale" | "2dollarshop" | "groupbuy";

export const marketShopTypes: Array<{ value: ShopType; labelKey: TranslationKey; icon: string; href: string }> = [
  { value: "all", labelKey: "all", icon: "ms-grid-view", href: "/market" },
  { value: "secondhand", labelKey: "shopTypeSecondhand", icon: "ms-storefront", href: "/market/secondhands" },
  { value: "garage-sale", labelKey: "shopTypeGarageSale", icon: "ms-warehouse", href: "/market/garage-sales" },
  { value: "moving-sale", labelKey: "shopTypeMovingSale", icon: "ms-local-shipping", href: "/market/moving-sales" },
  { value: "2dollarshop", labelKey: "shopTypeTwoDollarShop", icon: "ms-savings", href: "/market/2dollarshop" },
  { value: "groupbuy", labelKey: "shopTypeGroupBuy", icon: "ms-groups", href: "/market/groupbuy" },
];

const categoryIcons: Record<string, string> = {
  "mobile-phones-tablets": "ms-smartphone",
  "computers-laptops": "ms-computer",
  "electronics-appliances": "ms-tv",
  "furniture-home-decor": "ms-weekend",
  "home-kitchen": "ms-restaurant",
  "clothing-fashion": "ms-checkroom",
  "baby-kids": "ms-stroller",
  "books-music-media": "ms-menu-book",
  "hobbies-collectables": "ms-diamond",
  "games-toys": "ms-sports-esports",
  "sports-leisure": "ms-sports-soccer",
  "musical-instruments": "ms-music-note",
  "garden-tools-diy": "ms-build",
  "pet-supplies": "ms-pets",
  "health-beauty": "ms-monitor-heart",
};

const marketCategoryLabelKeys: Record<string, TranslationKey> = {
  "mobile-phones-tablets": "marketCategoryMobilePhonesTablets",
  "computers-laptops": "marketCategoryComputersLaptops",
  "electronics-appliances": "marketCategoryElectronicsAppliances",
  "furniture-home-decor": "marketCategoryFurnitureHomeDecor",
  "home-kitchen": "marketCategoryHomeKitchen",
  "clothing-fashion": "marketCategoryClothingFashion",
  "baby-kids": "marketCategoryBabyKids",
  "books-music-media": "marketCategoryBooksMusicMedia",
  "hobbies-collectables": "marketCategoryHobbiesCollectables",
  "games-toys": "marketCategoryGamesToys",
  "sports-leisure": "marketCategorySportsLeisure",
  "musical-instruments": "marketCategoryMusicalInstruments",
  "garden-tools-diy": "marketCategoryGardenToolsDiy",
  "pet-supplies": "marketCategoryPetSupplies",
  "health-beauty": "marketCategoryHealthBeauty",
};

const priceFilterMinimum = 50;
const priceFilterMaximum = 5000;
const conditionFilters = ["all", "brand_new", "like_new", "excellent", "good", "fair"] as const;
const conditionTranslationKeys = { all: "any", brand_new: "brandNew", like_new: "likeNew", excellent: "excellent", good: "good", fair: "fair" } as const;

export type MarketFilterSidebarProps = {
  activeShopType: ShopType;
  activeCategory: string;
  onCategorySelect: (categorySlug: string) => void;
  mainLocation: MainLocation | "";
  subLocation: string;
  onLocationChange: (mainLocation: MainLocation | "", subLocation?: string) => void;
  priceCondition?: {
    maxPrice: number;
    condition: string;
    onMaxPriceChange: (value: number) => void;
    onConditionChange: (value: string) => void;
    onApply: () => void;
  };
};

export function MarketFilterSidebar({ activeShopType, activeCategory, onCategorySelect, mainLocation, subLocation, onLocationChange, priceCondition }: MarketFilterSidebarProps) {
  const { t } = useLanguage();
  const priceProgress = priceCondition ? ((priceCondition.maxPrice - priceFilterMinimum) / (priceFilterMaximum - priceFilterMinimum)) * 100 : 100;

  return <BrowseFilterSidebar location={
    <LocationFilterSection title={t("location")} mainLocation={mainLocation} subLocation={subLocation} onLocationChange={onLocationChange} idPrefix="market" mainLocationLabel={t("mainLocationLabel")} subLocationLabel={t("subLocationLabel")} mainLocationPlaceholder={t("allNewZealand")} subLocationPlaceholder={t("anySubLocation")} />
  }>

    <section className="filter-block shop-type-filter market-type-filter">
      <h2>{t("marketType")}</h2>
      <div className="filter-list">
        {marketShopTypes.map(({ value, labelKey, href, icon }) => (
          <a key={value} href={href} className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} shop-type-${value} ${activeShopType === value ? "is-selected" : ""}`}>
            <span className="shop-type-illustration"><i className={`ms ${icon}`} aria-hidden="true" /></span>
            <span className={mobileDrawerClasses.menuLabel}>{t(labelKey)}</span>
          </a>
        ))}
      </div>
    </section>

    <section className="filter-block category-filter">
      <h2>{t("category")}</h2>
      <div className="filter-list category-filter-list">
        {[{ label: `${t("all")} ${t("category")}`, value: "all", icon: "ms-grid-view" }, ...marketplaceCategories.map(({ label, value }) => ({ label: marketCategoryLabelKeys[value] ? t(marketCategoryLabelKeys[value]) : label, value, icon: categoryIcons[value] }))].map(({ icon, label, value }) => (
          <button key={value} className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} ${activeCategory === value ? "is-selected" : ""}`} type="button" onClick={() => onCategorySelect(value)}>
            <i className={`ms ${icon}`} aria-hidden="true" />
            <span className={mobileDrawerClasses.menuLabel}>{label}</span>
          </button>
        ))}
      </div>
    </section>

    {priceCondition ? <>
      <section className="filter-block price-filter">
        <h2>{t("maxPrice")}</h2>
        <input className="price-filter-range" style={{ "--price-progress": `${priceProgress}%` } as CSSProperties} type="range" min={priceFilterMinimum} max={priceFilterMaximum} value={priceCondition.maxPrice} onChange={(event) => priceCondition.onMaxPriceChange(Number(event.target.value))} aria-valuetext={`$${priceCondition.maxPrice.toLocaleString()}`} />
        <div className="price-range">
          <span>${priceFilterMinimum}</span>
          <span>${priceCondition.maxPrice.toLocaleString()}</span>
        </div>
      </section>

      <section className="filter-block condition-filter">
        <h2>{t("condition")}</h2>
        <div className="condition-chips">
          {conditionFilters.map((value) => (
            <button key={value} className={priceCondition.condition === value ? "is-selected" : ""} type="button" aria-pressed={priceCondition.condition === value} onClick={() => priceCondition.onConditionChange(value)}>
              {t(conditionTranslationKeys[value])}
            </button>
          ))}
        </div>
      </section>

      <button className="apply-filter-button" type="button" onClick={priceCondition.onApply}>
        {t("applyFilters")}
      </button>
    </> : null}
  </BrowseFilterSidebar>;
}
