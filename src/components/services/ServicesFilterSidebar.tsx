"use client";

import { BrowseFilterSidebar } from "@/components/layout/BrowseFilterSidebar";
import { FilterMenuSection } from "@/components/layout/FilterMenuSection";
import { LocationFilterSection } from "@/components/ui/LocationFilterSection";
import { useLanguage } from "@/components/LanguageProvider";
import { type MainLocation } from "@/data/nzLocations";
import { serviceCategories, servicesCategoryLabels, servicesText, type ServiceCategoryId } from "@/data/services";

export type ServiceFilterState = {
  providerType: string;
  highlyRated: boolean;
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
    ? { heading: "후기", highlyRated: "평점 4.5 이상" }
    : { heading: "Reviews", highlyRated: "Rated 4.5+" };
  const providerTypes = [{ value: "all", label: text.allProviders }, { value: "individuals", label: text.individuals }, { value: "businesses", label: text.businesses }];

  return <BrowseFilterSidebar location={
    <LocationFilterSection title={t("location")} mainLocation={mainLocation} subLocation={subLocation} onLocationChange={onLocationChange} idPrefix="services" mainLocationLabel={t("mainLocationLabel")} subLocationLabel={t("subLocationLabel")} mainLocationPlaceholder={t("allNewZealand")} subLocationPlaceholder={t("anySubLocation")} />
  }>

    <FilterMenuSection
      title={text.serviceType}
      className="services-type-filter"
      itemClassPrefix="services-type"
      activeValue={activeCategory}
      onSelect={onCategorySelect}
      items={[{ value: "all" as const, label: text.allCategories, icon: "ms-grid-view" }, ...serviceCategories.map(({ id, icon }) => ({ value: id, label: categoryLabels[id], icon }))]}
    />

    {!compact ? <><section className="filter-block services-choice-filter"><h2>{text.providerType}</h2><div className="condition-chips">{providerTypes.map(({ value, label }) => <button key={value} className={filters.providerType === value ? "is-selected" : ""} type="button" aria-pressed={filters.providerType === value} onClick={() => onFilterChange("providerType", value)}>{label}</button>)}</div></section>
      <section className="filter-block services-quality-filter">
        <h2>{qualityLabels.heading}</h2>
        <label className="services-filter-toggle"><input type="checkbox" checked={filters.highlyRated} onChange={(event) => onFilterChange("highlyRated", event.target.checked)} /><span>{qualityLabels.highlyRated}</span></label>
      </section>

      <button className="apply-filter-button" type="button" onClick={onApply}>
        {text.applyFilters}
      </button></> : null}
  </BrowseFilterSidebar>;
}
