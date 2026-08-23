"use client";

import { mobileDrawerClasses } from "@/components/MobileDrawer";
import { BrowseFilterSidebar } from "@/components/layout/BrowseFilterSidebar";
import { LocationFilterSection } from "@/components/ui/LocationFilterSection";
import { useLanguage } from "@/components/LanguageProvider";
import { type MainLocation } from "@/data/nzLocations";
import { serviceCategories, servicesCategoryLabels, servicesText, type ServiceCategoryId } from "@/data/services";

export type ServiceFilterState = {
  providerType: string;
  availability: string;
  verified: boolean;
  highlyRated: boolean;
  fastResponder: boolean;
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
  compact?: boolean;
};

/**
 * Same rail as Market and Community — BrowseFilterSidebar shell, shared
 * filter-block sections, shared chip and apply controls — carrying the labels
 * and inputs that only Services has.
 */
export function ServicesFilterSidebar({ activeCategory, onCategorySelect, mainLocation, subLocation, onLocationChange, filters, onFilterChange, onApply, compact = false }: ServicesFilterSidebarProps) {
  const { t, locale } = useLanguage();
  const text = servicesText(locale);
  const categoryLabels = servicesCategoryLabels(locale);

  const qualityLabels = locale === "ko"
    ? { heading: "신뢰 및 품질", verified: "인증됨", highlyRated: "높은 평점", fastResponder: "빠른 응답" }
    : { heading: "Trust & Quality", verified: "Verified", highlyRated: "Highly rated", fastResponder: "Fast responder" };
  const providerTypes = [{ value: "all", label: text.allProviders }, { value: "individuals", label: text.individuals }, { value: "businesses", label: text.businesses }];
  const availabilities = [{ value: "all", label: text.anytime }, { value: "today", label: text.quickFilters.availableToday }, { value: "this-week", label: text.thisWeek }];

  return <BrowseFilterSidebar location={
    <LocationFilterSection title={t("location")} mainLocation={mainLocation} subLocation={subLocation} onLocationChange={onLocationChange} idPrefix="services" mainLocationLabel={t("mainLocationLabel")} subLocationLabel={t("subLocationLabel")} mainLocationPlaceholder={t("allNewZealand")} subLocationPlaceholder={t("anySubLocation")} />
  }>

    <section className="filter-block services-type-filter">
      <h2>{text.serviceType}</h2>
      <div className="filter-list">
        {[{ value: "all" as const, label: text.allCategories, icon: "fa-border-all" }, ...serviceCategories.map(({ id, icon }) => ({ value: id, label: categoryLabels[id], icon }))].map(({ value, label, icon }) => (
          <button key={value} className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} services-type-${value} ${activeCategory === value ? "is-selected" : ""}`} type="button" onClick={() => onCategorySelect(value)}>
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
            <span className={mobileDrawerClasses.menuLabel}>{label}</span>
          </button>
        ))}
      </div>
    </section>

    {!compact ? <><section className="filter-block services-choice-filter"><h2>{text.providerType}</h2><div className="condition-chips">{providerTypes.map(({ value, label }) => <button key={value} className={filters.providerType === value ? "is-selected" : ""} type="button" aria-pressed={filters.providerType === value} onClick={() => onFilterChange("providerType", value)}>{label}</button>)}</div></section>
      <section className="filter-block services-choice-filter"><h2>{text.availability}</h2><div className="condition-chips">{availabilities.map(({ value, label }) => <button key={value} className={filters.availability === value ? "is-selected" : ""} type="button" aria-pressed={filters.availability === value} onClick={() => onFilterChange("availability", value)}>{label}</button>)}</div></section>

      <section className="filter-block services-quality-filter">
        <h2>{qualityLabels.heading}</h2>
        {(["verified", "highlyRated", "fastResponder"] as const).map((key) => <label className="services-filter-toggle" key={key}>
          <input type="checkbox" checked={filters[key]} onChange={(event) => onFilterChange(key, event.target.checked)} />
          <span>{qualityLabels[key]}</span>
        </label>)}
      </section>

      <button className="apply-filter-button" type="button" onClick={onApply}>
        {text.applyFilters}
      </button></> : null}
  </BrowseFilterSidebar>;
}
