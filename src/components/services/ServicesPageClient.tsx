"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useLanguage } from "@/components/LanguageProvider";
import { ServicesFilterSidebar, type ServiceFilterState } from "@/components/services/ServicesFilterSidebar";
import { ServicesResultsToolbar } from "@/components/services/ServicesResultsToolbar";
import { Button } from "@/components/ui/Button";
import { type MainLocation } from "@/data/nzLocations";
import { serviceCategories, services, servicesCategoryLabels, servicesText, trustPoints, type ServiceCategoryId } from "@/data/services";
import { readListingViewPreference, saveListingViewPreference, type ListingViewMode } from "@/lib/market/listing-view-preference";

const defaultFilters: ServiceFilterState = { providerType: "all", priceBand: "all", availability: "all", rating: "all", verifiedOnly: false };

export function ServicesPageClient() {
  const { locale } = useLanguage();
  const text = servicesText(locale);
  const categoryLabels = servicesCategoryLabels(locale);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ListingViewMode>("grid");
  const [activeCategory, setActiveCategory] = useState<ServiceCategoryId | "all">("all");
  const [activeChip, setActiveChip] = useState("all");
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
  const visibleServices = useMemo(
    () => activeCategory === "all" ? services : services.filter((service) => service.category === activeCategory),
    [activeCategory],
  );

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
      <button
        className={`floating-filter-button ${isFilterOpen ? "is-open" : ""}`}
        type="button"
        aria-label={isFilterOpen ? text.closeFilters : text.openFilters}
        aria-expanded={isFilterOpen}
        onClick={() => setIsFilterOpen((current) => !current)}
      >
        <i className="fa-solid fa-sliders filter-toggle-icon filter-toggle-icon-open" aria-hidden="true" />
        <i className="fa-solid fa-xmark filter-toggle-icon filter-toggle-icon-close" aria-hidden="true" />
      </button>

      <MobileDrawer open={isFilterOpen} onClose={() => setIsFilterOpen(false)} ariaLabel={text.closeFilters} className="filter-backdrop" panelClassName="market-filter-panel services-filter-rail">
        <button className="filter-close-button" type="button" aria-label={text.closeFilters} onClick={() => setIsFilterOpen(false)}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
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
      </MobileDrawer>

      <section className="market-results services-results" aria-label={text.popularServices} ref={resultsRef}>
        <div className="services-intro">
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

        <ServicesResultsToolbar
          viewMode={viewMode}
          onViewModeChange={chooseView}
          activeChipValue={activeChip}
          onChipSelect={setActiveChip}
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
              <div className="services-listing-image"><Image src={service.image} alt={listing.imageAlt} fill sizes="(max-width: 767px) 84vw, (max-width: 1023px) 42vw, (min-width: 1280px) 15vw, 24vw" /><button type="button" aria-label={text.saveService(listing.title)} onClick={() => setNotice(text.saveNotice(listing.title))}><i className="fa-regular fa-heart" aria-hidden="true" /></button><span className={`ui-pill ${service.badgeClass === "success" ? "ui-pill--success" : "ui-pill--warning"}`}>{listing.badge}</span></div>
              <div className="services-listing-copy"><h3>{listing.title}</h3><p><i className="fa-solid fa-user-circle" aria-hidden="true" /> {service.provider}</p><div className="services-listing-meta"><span><i className="fa-solid fa-star" aria-hidden="true" /> {service.rating}</span><span>{listing.charge}</span></div><span className="services-listing-location"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {listing.location}</span><em>{text.serviceDescription}</em><strong>{listing.price}</strong><footer><button type="button" onClick={() => setNotice(`${text.message}: ${service.provider}`)}><i className="fa-regular fa-message" aria-hidden="true" /> {text.message}</button><button type="button" onClick={() => setNotice(`${text.viewProfile}: ${service.provider}`)}>{text.viewProfile}</button></footer></div>
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
