"use client";

import { mobileDrawerClasses } from "@/components/MobileDrawer";
import { BrowseFilterSidebar } from "@/components/layout/BrowseFilterSidebar";
import { LocationFilterSection } from "@/components/ui/LocationFilterSection";
import { useLanguage } from "@/components/LanguageProvider";
import { type MainLocation } from "@/data/nzLocations";
import { serviceCategories, servicesCategoryLabels, servicesText, type ServiceCategoryId } from "@/data/services";

export type ServiceFilterState = {
  providerType: string;
  priceBand: string;
  availability: string;
  rating: string;
  verifiedOnly: boolean;
};

export type ServicesFilterSidebarProps = {
  activeCategory: ServiceCategoryId | "all";
  onCategorySelect: (category: ServiceCategoryId | "all") => void;
  mainLocation: MainLocation | "";
  subLocation: string;
  onLocationChange: (mainLocation: MainLocation | "", subLocation?: string) => void;
  filters: ServiceFilterState;
  onFilterChange: <Key extends keyof ServiceFilterState>(key: Key, value: ServiceFilterState[Key]) => void;
  onApply: () => void;
};

/**
 * Same rail as Market and Community — BrowseFilterSidebar shell, shared
 * filter-block sections, shared chip and apply controls — carrying the labels
 * and inputs that only Services has.
 */
export function ServicesFilterSidebar({ activeCategory, onCategorySelect, mainLocation, subLocation, onLocationChange, filters, onFilterChange, onApply }: ServicesFilterSidebarProps) {
  const { t, locale } = useLanguage();
  const text = servicesText(locale);
  const categoryLabels = servicesCategoryLabels(locale);

  const providerTypes = [
    { value: "all", label: text.allProviders },
    { value: "individuals", label: text.individuals },
    { value: "businesses", label: text.businesses },
  ];
  const priceBands = [
    { value: "all", label: text.anyPrice },
    { value: "under-50", label: text.underFifty },
    { value: "50-100", label: text.fiftyToHundred },
    { value: "over-100", label: text.overHundred },
  ];
  const availabilities = [
    { value: "all", label: text.anytime },
    { value: "today", label: text.quickFilters.availableToday },
    { value: "this-week", label: text.thisWeek },
  ];
  const ratings = [
    { value: "all", label: text.anyRating },
    { value: "4.5", label: text.fourFiveAbove },
    { value: "4.0", label: text.fourAbove },
  ];

  return <BrowseFilterSidebar location={
    <LocationFilterSection title={t("location")} mainLocation={mainLocation} subLocation={subLocation} onLocationChange={onLocationChange} idPrefix="services" mainLocationLabel={t("mainLocationLabel")} subLocationLabel={t("subLocationLabel")} mainLocationPlaceholder={t("allNewZealand")} subLocationPlaceholder={t("anySubLocation")} />
  }>

    <section className="filter-block category-filter">
      <h2>{text.serviceType}</h2>
      <div className="filter-list category-filter-list">
        {[{ value: "all" as const, label: text.allCategories, icon: "fa-border-all" }, ...serviceCategories.map(({ id, icon }) => ({ value: id, label: categoryLabels[id], icon }))].map(({ value, label, icon }) => (
          <button key={value} className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} ${activeCategory === value ? "is-selected" : ""}`} type="button" onClick={() => onCategorySelect(value)}>
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
            <span className={mobileDrawerClasses.menuLabel}>{label}</span>
          </button>
        ))}
      </div>
    </section>

    <section className="filter-block services-choice-filter">
      <h2>{text.providerType}</h2>
      <div className="condition-chips">
        {providerTypes.map(({ value, label }) => (
          <button key={value} className={filters.providerType === value ? "is-selected" : ""} type="button" aria-pressed={filters.providerType === value} onClick={() => onFilterChange("providerType", value)}>{label}</button>
        ))}
      </div>
    </section>

    <section className="filter-block services-choice-filter">
      <h2>{text.priceRange}</h2>
      <div className="condition-chips">
        {priceBands.map(({ value, label }) => (
          <button key={value} className={filters.priceBand === value ? "is-selected" : ""} type="button" aria-pressed={filters.priceBand === value} onClick={() => onFilterChange("priceBand", value)}>{label}</button>
        ))}
      </div>
    </section>

    <section className="filter-block services-choice-filter">
      <h2>{text.availability}</h2>
      <div className="condition-chips">
        {availabilities.map(({ value, label }) => (
          <button key={value} className={filters.availability === value ? "is-selected" : ""} type="button" aria-pressed={filters.availability === value} onClick={() => onFilterChange("availability", value)}>{label}</button>
        ))}
      </div>
    </section>

    <section className="filter-block services-choice-filter">
      <h2>{text.rating}</h2>
      <div className="condition-chips">
        {ratings.map(({ value, label }) => (
          <button key={value} className={filters.rating === value ? "is-selected" : ""} type="button" aria-pressed={filters.rating === value} onClick={() => onFilterChange("rating", value)}>{label}</button>
        ))}
      </div>
    </section>

    <section className="filter-block services-verified-filter">
      <h2>{text.verified}</h2>
      <label className="services-filter-toggle">
        <input type="checkbox" checked={filters.verifiedOnly} onChange={(event) => onFilterChange("verifiedOnly", event.target.checked)} />
        <span>{text.verifiedOnly}</span>
      </label>
    </section>

    <button className="apply-filter-button" type="button" onClick={onApply}>
      {text.applyFilters}
    </button>
  </BrowseFilterSidebar>;
}
