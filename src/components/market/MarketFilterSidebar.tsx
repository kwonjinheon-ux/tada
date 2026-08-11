"use client";

import { mobileDrawerClasses } from "@/components/MobileDrawer";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { marketplaceCategories } from "@/data/marketplace-categories";
import { NZ_MAIN_LOCATIONS, getSubLocations, type MainLocation } from "@/data/nzLocations";
import { useLanguage } from "@/components/LanguageProvider";

export type ShopType = "all" | "secondhand" | "garage-sale" | "moving-sale" | "2dollarshop" | "groupbuy";

const shopTypes: Array<{ value: ShopType; label: string; icon: string; href: string }> = [
  { value: "all", label: "All", icon: "fa-border-all", href: "/market" },
  { value: "secondhand", label: "Market", icon: "fa-store", href: "/market/secondhands" },
  { value: "garage-sale", label: "Garage Sale", icon: "fa-warehouse", href: "/market/garage-sales" },
  { value: "moving-sale", label: "Moving Sale", icon: "fa-truck-ramp-box", href: "/market/moving-sales" },
  { value: "2dollarshop", label: "2 Dollar Shop", icon: "fa-coins", href: "/market/2dollarshop" },
  { value: "groupbuy", label: "Group Buy", icon: "fa-people-group", href: "/market/groupbuy" },
];

const categoryIcons: Record<string, string> = {
  "mobile-phones-tablets": "fa-mobile-screen-button",
  "computers-laptops": "fa-laptop",
  "electronics-appliances": "fa-tv",
  "furniture-home-decor": "fa-couch",
  "home-kitchen": "fa-kitchen-set",
  "clothing-fashion": "fa-shirt",
  "baby-kids": "fa-baby",
  "books-music-media": "fa-book-open",
  "hobbies-collectables": "fa-gem",
  "games-toys": "fa-gamepad",
  "sports-leisure": "fa-futbol",
  "musical-instruments": "fa-guitar",
  "garden-tools-diy": "fa-screwdriver-wrench",
  "pet-supplies": "fa-paw",
  "health-beauty": "fa-heart-pulse",
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

  return <>
    <section className="filter-block location-block market-filter-location-section">
      <h2>Location</h2>
      <SelectMenu id="market-main-location" name="mainLocation" label="Main Location" icon="fa-location-dot" placeholder="All New Zealand" options={NZ_MAIN_LOCATIONS.map((location) => ({ label: location, value: location }))} value={mainLocation} onChange={(nextLocation) => onLocationChange(nextLocation as MainLocation | "")} className="market-location-select" hideLabel />
      <SelectMenu id="market-sub-location" name="subLocation" label="Sub Location" icon="fa-map-pin" placeholder="Any sub location" options={mainLocation ? getSubLocations(mainLocation).map((location) => ({ label: location, value: location })) : []} value={subLocation} disabled={!mainLocation} onChange={(nextSubLocation) => onLocationChange(mainLocation, nextSubLocation)} className="market-location-select" hideLabel />
    </section>

    <section className="filter-block shop-type-filter">
      <h2>Shop Type</h2>
      <div className="filter-list">
        {shopTypes.map(({ value, label, icon, href }) => (
          <a key={value} href={href} className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} shop-type-${value} ${activeShopType === value ? "is-selected" : ""}`}>
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
            <span className={mobileDrawerClasses.menuLabel}>{label}</span>
          </a>
        ))}
      </div>
    </section>

    <section className="filter-block category-filter">
      <h2>{t("category")}</h2>
      <div className="filter-list">
        {[{ label: t("all"), value: "all", icon: "fa-border-all" }, ...marketplaceCategories.map(({ label, value }) => ({ label, value, icon: categoryIcons[value] }))].map(({ icon, label, value }) => (
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
  </>;
}
