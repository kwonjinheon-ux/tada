"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrowseFilterDrawer } from "@/components/browse/BrowseFilterDrawer";
import { useLanguage } from "@/components/LanguageProvider";
import { ServicesFilterSidebar, type ServiceFilterState } from "@/components/services/ServicesFilterSidebar";
import { BrowseResultsToolbar } from "@/components/browse/BrowseResultsToolbar";
import { Button } from "@/components/ui/Button";
import { type MainLocation } from "@/data/nzLocations";
import { serviceBadgeLabel, serviceCategories, services, servicesCategoryLabels, servicesText, trustPoints, type ServiceCategoryId } from "@/data/services";
import { readListingViewPreference, saveListingViewPreference, type ListingViewMode } from "@/lib/market/listing-view-preference";

const defaultFilters: ServiceFilterState = { providerType: "all", availability: "all", verified: false, highlyRated: false, fastResponder: false };

export function ServicesPageClient() {
  const { t, locale } = useLanguage();
  const text = servicesText(locale);
  const categoryLabels = servicesCategoryLabels(locale);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ListingViewMode>("grid");
  const [activeCategory, setActiveCategory] = useState<ServiceCategoryId | "all">("all");
  const [activeChip, setActiveChip] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [mainLocation, setMainLocation] = useState<MainLocation | "">("");
  const [subLocation, setSubLocation] = useState("");
  const [filters, setFilters] = useState<ServiceFilterState>(defaultFilters);
  const [notice, setNotice] = useState("");
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => setViewMode(readListingViewPreference() ?? (window.innerWidth < 1024 ? "list" : "grid")), []);

  // The header's category trigger drives every browse surface's drawer.
  useEffect(() => {
    const openFilters = (event: Event) => {
      const section = (event as CustomEvent<string | undefined>).detail;
      if (!section || section === "services") setIsFilterOpen(true);
    };
    const closeFilters = () => setIsFilterOpen(false);
    window.addEventListener("mobile-category-menu-request", openFilters);
    window.addEventListener("mobile-category-menu-close", closeFilters);
    return () => {
      window.removeEventListener("mobile-category-menu-request", openFilters);
      window.removeEventListener("mobile-category-menu-close", closeFilters);
    };
  }, []);
  const chooseView = (mode: ListingViewMode) => {
    setViewMode(mode);
    saveListingViewPreference(mode);
  };

  // Services is still a preview, so the rail only filters by category. The rest
  // of the controls carry the shared design without a query behind them yet.
  const visibleServices = useMemo(() => {
    const matches = services.filter((service) => (activeCategory === "all" || service.category === activeCategory)
      && (filters.providerType === "all" || service.providerType === filters.providerType)
      && (filters.availability === "all" || service.availability === filters.availability)
      && (!filters.verified || service.badges.includes("verified"))
      && (!filters.highlyRated || service.badges.includes("highlyRated"))
      && (!filters.fastResponder || service.badges.includes("fastResponder")));
    return [...matches].sort((a, b) => sort === "highest-rated" ? b.rating - a.rating || b.reviewCount - a.reviewCount : sort === "most-reviewed" ? b.reviewCount - a.reviewCount : sort === "newest" ? Number(b.badges.includes("new")) - Number(a.badges.includes("new")) : b.rating * b.reviewCount - a.rating * a.reviewCount);
  }, [activeCategory, filters, sort]);

  // Picking a category closes the rail and takes the reader straight to the
  // filtered list, which on a phone is otherwise hidden behind the drawer.
  const chooseCategory = (category: ServiceCategoryId | "all") => {
    setActiveCategory(category);
    setIsFilterOpen(false);
    setNotice("");
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="marketplace-page services-page">
      <BrowseFilterDrawer open={isFilterOpen} onOpenChange={setIsFilterOpen} openLabel={text.openFilters} closeLabel={text.closeFilters} panelClassName="services-filter-rail">
        <ServicesFilterSidebar
          activeCategory={activeCategory}
          onCategorySelect={chooseCategory}
          mainLocation={mainLocation}
          subLocation={subLocation}
          onLocationChange={(nextMainLocation, nextSubLocation = "") => { setMainLocation(nextMainLocation); setSubLocation(nextSubLocation); }}
          filters={filters}
          onFilterChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          onApply={() => setIsFilterOpen(false)}
        />
      </BrowseFilterDrawer>

      <section className="market-results services-results" aria-label={text.popularServices} ref={resultsRef}>
        <div className="browse-intro">
          <h1>{text.heroTitle}</h1>
          <p>{text.heroDescription}</p>
        </div>

        <div className="services-category-grid" role="group" aria-label={text.serviceType}>
          {serviceCategories.map(({ id, icon }) => (
            <button key={id} className={activeCategory === id ? "services-category is-active" : "services-category"} type="button" aria-pressed={activeCategory === id} onClick={() => chooseCategory(activeCategory === id ? "all" : id)}>
              <span><i className={`fa-solid ${icon}`} aria-hidden="true" /></span>
              <strong>{categoryLabels[id]}</strong>
            </button>
          ))}
        </div>

        <BrowseResultsToolbar
          viewMode={viewMode}
          onViewModeChange={chooseView}
          chips={[
            { value: "all", label: t("all") },
            { value: "nearMe", label: text.quickFilters.nearMe },
          ]}
          activeChipValue={activeChip}
          onChipSelect={setActiveChip}
          sortValue={sort}
          sortOptions={locale === "ko" ? [{ value: "recommended", label: "추천순" }, { value: "highest-rated", label: "평점 높은순" }, { value: "most-reviewed", label: "후기 많은순" }, { value: "newest", label: "최신순" }] : [{ value: "recommended", label: "Recommended" }, { value: "highest-rated", label: "Highest rated" }, { value: "most-reviewed", label: "Most reviewed" }, { value: "newest", label: "Newest" }]}
          onSortChange={setSort}
          resultsLabel={text.serviceCount(visibleServices.length)}
        />

        <section className="services-sponsor-banner" aria-label={text.sponsored}>
          <div className="services-sponsor-copy"><span>{text.sponsored}</span><strong>{text.sponsorTitle}</strong><p>{text.sponsorDescription}</p></div>
          <ul>{text.benefits.map((benefit) => <li key={benefit}><i className="fa-solid fa-circle-check" aria-hidden="true" /> {benefit}</li>)}</ul>
          <Image src={services[0].image} alt="" width={180} height={108} />
          <button type="button" onClick={() => setNotice(text.providerNotice)}>{text.learnMore}</button>
        </section>

        <div className={`services-card-grid ${viewMode === "list" ? "is-list-view" : ""}`}>
          {visibleServices.map((service) => {
            const listing = text.listings[service.id];
            return <article className="services-listing ui-card" key={service.id}>
              <div className="services-listing-image"><Image src={service.image} alt={listing.imageAlt} fill sizes="(max-width: 767px) 64px, 68px" /></div>
              <div className="services-listing-copy"><header><div><h3>{service.provider}</h3><p className="services-listing-service-title">{listing.title}</p></div><a className="services-listing-call" href={`tel:${service.phone.replace(/\s/g, "")}`} aria-label={`${service.provider}: ${service.phone}`}><i className="fa-solid fa-phone" aria-hidden="true" /></a></header><div className="services-listing-badges">{service.badges.map((badge) => <span className={`service-badge is-${badge}`} key={badge}>{serviceBadgeLabel(badge, locale)}</span>)}</div><div className="services-listing-contact"><span><i className="fa-solid fa-phone" aria-hidden="true" /> {service.phone}</span><span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {listing.location}</span></div><div className="services-listing-meta"><span><i className="fa-solid fa-star" aria-hidden="true" /> {service.rating.toFixed(1)} ({service.reviewCount} {locale === "ko" ? "후기" : "reviews"})</span><strong>{listing.price}</strong></div><footer><button type="button" onClick={() => setNotice(`${text.message}: ${service.provider}`)}><i className="fa-regular fa-message" aria-hidden="true" /> {text.message}</button><button type="button" onClick={() => setNotice(`${text.viewProfile}: ${service.provider}`)}>{text.viewProfile}</button></footer></div>
            </article>;
          })}
        </div>

        {notice ? <p className="services-notice" role="status">{notice}</p> : null}

        <section className="services-request-cta ui-card" aria-labelledby="services-request-title">
          <span className="services-request-icon"><i className="fa-solid fa-clipboard-list" aria-hidden="true" /></span>
          <div><p>{text.requestEyebrow}</p><h2 id="services-request-title">{text.requestTitle}</h2><span>{text.requestDescription}</span></div>
          <Button pill onClick={() => setNotice(text.requestNotice)}><i className="fa-solid fa-plus" aria-hidden="true" /> {text.requestAction}</Button>
        </section>
      </section>

      <aside className="services-side-rail" aria-label={text.whyTadaServices}>
        <section className="services-provider-promo ui-card">
          <span className="ui-pill">{text.providerLabel}</span>
          <i className="fa-solid fa-chart-line" aria-hidden="true" />
          <h2>{text.providerTitle}</h2>
          <p>{text.providerDescription}</p>
          <button type="button" onClick={() => setNotice(text.providerNotice)}>{text.providerAction} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
        </section>
        <section className="services-trust-panel ui-panel">
          {trustPoints.map((point) => <article key={point.id}><i className={`fa-solid ${point.icon}`} aria-hidden="true" /><div><h2>{text.trust[point.id].title}</h2><p>{text.trust[point.id].description}</p></div></article>)}
          <button type="button" onClick={() => setNotice(text.trustNotice)}>{text.trustAction} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
        </section>
      </aside>
    </main>
  );
}
