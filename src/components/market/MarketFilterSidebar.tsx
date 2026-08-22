"use client";

import { mobileDrawerClasses } from "@/components/MobileDrawer";
import { BrowseFilterSidebar } from "@/components/layout/BrowseFilterSidebar";
import { LocationFilterSection } from "@/components/ui/LocationFilterSection";
import { marketplaceCategories } from "@/data/marketplace-categories";
import { type MainLocation } from "@/data/nzLocations";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";
import { marketCategoryIcons, marketCategoryLabelKeys } from "@/components/market/MarketCategoryGrid";

export type ShopType = "all" | "secondhand" | "garage-sale" | "moving-sale" | "2dollarshop" | "groupbuy";

export const marketShopTypes: Array<{ value: ShopType; labelKey: TranslationKey; icon: string; href: string }> = [
  { value: "all", labelKey: "all", icon: "fa-border-all", href: "/market" },
  { value: "secondhand", labelKey: "shopTypeSecondhand", icon: "fa-store", href: "/market/secondhands" },
  { value: "garage-sale", labelKey: "shopTypeGarageSale", icon: "fa-warehouse", href: "/market/garage-sales" },
  { value: "moving-sale", labelKey: "shopTypeMovingSale", icon: "fa-truck-ramp-box", href: "/market/moving-sales" },
  { value: "2dollarshop", labelKey: "shopTypeTwoDollarShop", icon: "fa-coins", href: "/market/2dollarshop" },
  { value: "groupbuy", labelKey: "shopTypeGroupBuy", icon: "fa-people-group", href: "/market/groupbuy" },
];

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

  return <BrowseFilterSidebar location={
    <LocationFilterSection title={t("location")} mainLocation={mainLocation} subLocation={subLocation} onLocationChange={onLocationChange} idPrefix="market" mainLocationLabel={t("mainLocationLabel")} subLocationLabel={t("subLocationLabel")} mainLocationPlaceholder={t("allNewZealand")} subLocationPlaceholder={t("anySubLocation")} />
  }>

    <section className="filter-block shop-type-filter market-type-filter">
      <h2>{t("marketType")}</h2>
      <div className="filter-list">
        {marketShopTypes.map(({ value, labelKey, icon, href }) => (
          <a key={value} href={href} className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} shop-type-${value} ${activeShopType === value ? "is-selected" : ""}`}>
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
            <span className={mobileDrawerClasses.menuLabel}>{t(labelKey)}</span>
          </a>
        ))}
      </div>
    </section>

    <section className="filter-block category-filter">
      <h2>{t("category")}</h2>
      <div className="filter-list category-filter-list">
        {[{ label: `${t("all")} ${t("category")}`, value: "all", icon: "fa-border-all" }, ...marketplaceCategories.map(({ label, value }) => ({ label: marketCategoryLabelKeys[value] ? t(marketCategoryLabelKeys[value]) : label, value, icon: marketCategoryIcons[value] }))].map(({ icon, label, value }) => (
          <button key={value} className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} ${activeCategory === value ? "is-selected" : ""}`} type="button" onClick={() => onCategorySelect(value)}>
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
            <span className={mobileDrawerClasses.menuLabel}>{label}</span>
          </button>
        ))}
      </div>
    </section>

    {priceCondition ? <>
      <section className="filter-block price-filter">
        <h2>{t("maxPrice")}</h2>
        <input type="range" min={priceFilterMinimum} max={priceFilterMaximum} value={priceCondition.maxPrice} onChange={(event) => priceCondition.onMaxPriceChange(Number(event.target.value))} aria-valuetext={`$${priceCondition.maxPrice.toLocaleString()}`} />
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
