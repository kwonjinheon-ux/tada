"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrowseFilterDrawer } from "@/components/browse/BrowseFilterDrawer";
import { useLanguage } from "@/components/LanguageProvider";
import { ServicesFilterSidebar, type ServiceFilterState } from "@/components/services/ServicesFilterSidebar";
import { BrowseResultsToolbar } from "@/components/browse/BrowseResultsToolbar";
import { MobileBrowseCategoryRail } from "@/components/browse/MobileBrowseCategoryRail";
import { Button } from "@/components/ui/Button";
import { type MainLocation } from "@/data/nzLocations";
import { serviceBadgeLabel, serviceDetailsSummary, serviceCategories, servicesCategoryLabels, servicesText, type ServiceCategoryId, type ServiceListing } from "@/data/services";
import { ServiceSaveButton } from "@/components/services/ServiceSaveButton";
import { ServiceCallControl } from "@/components/services/ServiceCallControl";
import { scrollToListTop } from "@/lib/scroll-to-list-top";
import { useProfileMainLocation } from "@/lib/market/useProfileMainLocation";
import { serviceFeedResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import type { ServicesFeedQuery, ServicesFeedResult } from "@/lib/services/feed";

const defaultFilters: ServiceFilterState = { providerType: "all", availability: "all", verified: false, highlyRated: false, fastResponder: false };
const FEED_CACHE_TTL_MS = 30_000;

/** The feed request a browse URL stands for; doubles as the cache key. */
const buildFeedQuery = ({ category, mainLocation, subLocation }: ServicesFeedQuery) => {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (mainLocation) params.set("mainLocation", mainLocation);
  if (subLocation) params.set("subLocation", subLocation);
  return params.toString();
};

export function ServicesPageClient({ initialFeed = null, initialQuery }: { initialFeed?: ServicesFeedResult | null; initialQuery?: ServicesFeedQuery } = {}) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = servicesText(locale);
  const categoryLabels = servicesCategoryLabels(locale);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeChip, setActiveChip] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [filters, setFilters] = useState<ServiceFilterState>(defaultFilters);
  const [notice, setNotice] = useState("");
  const resultsRef = useRef<HTMLElement>(null);
  // Choosing a category rewrites the URL with history.pushState so the list can
  // be fetched here instead of paying for an RSC navigation of a force-dynamic
  // page. The App Router does not observe that write, so the pushed query is
  // held here until a real navigation (or Back/Forward) makes the URL
  // authoritative again.
  const [pushedSearch, setPushedSearch] = useState<string | null>(null);
  useEffect(() => { setPushedSearch(null); }, [searchParams]);
  useEffect(() => {
    const syncFromUrl = () => setPushedSearch(null);
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);
  const activeSearch = pushedSearch ?? searchParams.toString();
  const activeParams = useMemo(() => new URLSearchParams(activeSearch), [activeSearch]);
  const requestedCategory = activeParams.get("category");
  const activeCategory: ServiceCategoryId | "all" = serviceCategories.some(({ id }) => id === requestedCategory) ? requestedCategory as ServiceCategoryId : "all";
  const mainLocation = (activeParams.get("mainLocation") ?? "") as MainLocation | "";
  const subLocation = activeParams.get("subLocation") ?? "";
  const [feed, setFeed] = useState<ServicesFeedResult>(initialFeed ?? { services: [] });
  const [isLoadingServices, setIsLoadingServices] = useState(!initialFeed);
  // Seeding the cache with the server-rendered list keeps the first paint from
  // requesting what the page already shipped.
  const feedCache = useRef(new Map<string, { feed: ServicesFeedResult; cachedAt: number }>(
    initialFeed && initialQuery ? [[buildFeedQuery(initialQuery), { feed: initialFeed, cachedAt: Date.now() }]] : [],
  ));
  const feedQuery = buildFeedQuery({ category: activeCategory === "all" ? null : activeCategory, mainLocation, subLocation });
  useEffect(() => {
    if (searchParams.get("submitted") === "pending") {
      setNotice(locale === "ko" ? "서비스 등록 신청이 접수되었습니다. 검토가 완료되면 공개됩니다." : "Your service listing was submitted and is awaiting review.");
    }
  }, [locale, searchParams]);

  // Soft navigations deliver a new server list; seed its own key before the
  // loading effect runs so it is not fetched a second time.
  useEffect(() => {
    if (initialFeed && initialQuery) feedCache.current.set(buildFeedQuery(initialQuery), { feed: initialFeed, cachedAt: Date.now() });
  }, [initialFeed, initialQuery]);

  useEffect(() => {
    const cached = feedCache.current.get(feedQuery);
    if (cached && Date.now() - cached.cachedAt < FEED_CACHE_TTL_MS) {
      setFeed(cached.feed);
      setIsLoadingServices(false);
      return;
    }
    const controller = new AbortController();
    setIsLoadingServices(true);
    void fetch(`/api/services/listings?${feedQuery}`, { signal: controller.signal })
      .then((response) => readApiResponse(response, serviceFeedResponseSchema))
      .then((result) => {
        if (!result.data) return;
        const nextFeed = result.data as ServicesFeedResult;
        feedCache.current.set(feedQuery, { feed: nextFeed, cachedAt: Date.now() });
        setFeed(nextFeed);
      })
      .catch(() => undefined)
      .finally(() => { if (!controller.signal.aborted) setIsLoadingServices(false); });
    return () => controller.abort();
  }, [feedQuery, initialFeed, initialQuery]);

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
  // The category and the area are part of the request now, so what is left
  // here is the handful of flags the rail toggles without a round trip.
  const visibleServices = useMemo(() => {
    const matches = feed.services.filter((service) => (filters.providerType === "all" || service.providerType === filters.providerType)
      && (filters.availability === "all" || service.availability === filters.availability)
      && (!filters.verified || service.badges.includes("verified"))
      && (!filters.highlyRated || service.badges.includes("highlyRated"))
      && (!filters.fastResponder || service.badges.includes("fastResponder")));
    return [...matches].sort((a, b) => sort === "highest-rated" ? b.rating - a.rating || b.reviewCount - a.reviewCount : sort === "most-reviewed" ? b.reviewCount - a.reviewCount : sort === "newest" ? Number(b.badges.includes("new")) - Number(a.badges.includes("new")) : b.rating * b.reviewCount - a.rating * a.reviewCount);
  }, [feed, filters, sort]);

  // Picking a category closes the rail and takes the reader straight to the
  // filtered list, which on a phone is otherwise hidden behind the drawer.
  /** Puts a filter change on the URL without asking the server for the page. */
  const applyBrowseParams = (params: URLSearchParams, { replace = false } = {}) => {
    const query = params.toString();
    const nextUrl = `/services${query ? `?${query}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` === nextUrl) return;
    window.history[replace ? "replaceState" : "pushState"](window.history.state, "", nextUrl);
    setPushedSearch(query);
  };
  const chooseCategory = (category: ServiceCategoryId | "all") => {
    const params = new URLSearchParams(window.location.search);
    if (category === "all") params.delete("category"); else params.set("category", category);
    applyBrowseParams(params);
    setIsFilterOpen(false);
    setNotice("");
    scrollToListTop(resultsRef.current);
  };
  const chooseLocation = (nextMainLocation: MainLocation | "", nextSubLocation = "", { replace = false } = {}) => {
    const params = new URLSearchParams(window.location.search);
    // Written even when empty, so All New Zealand reads as a choice.
    params.set("mainLocation", nextMainLocation);
    params.set("subLocation", nextSubLocation);
    applyBrowseParams(params, { replace });
  };
  // The reader's own area to begin with, the way Market and Community open.
  // It is not a choice they made, so it does not earn a history entry.
  useProfileMainLocation({
    hasMainLocationInUrl: activeParams.has("mainLocation") || activeParams.has("subLocation"),
    mainLocation,
    onResolve: (profileMainLocation) => chooseLocation(profileMainLocation, "", { replace: true }),
  });

  return (
    <main className="marketplace-page services-page">
      <BrowseFilterDrawer open={isFilterOpen} onOpenChange={setIsFilterOpen} openLabel={text.openFilters} closeLabel={text.closeFilters} panelClassName="services-filter-rail">
        <ServicesFilterSidebar
          activeCategory={activeCategory}
          onCategorySelect={chooseCategory}
          mainLocation={mainLocation}
          subLocation={subLocation}
          onLocationChange={chooseLocation}
          filters={filters}
          onFilterChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          onApply={() => setIsFilterOpen(false)}
        />
      </BrowseFilterDrawer>

      <section className="market-results services-results" aria-label={text.popularServices} aria-busy={isLoadingServices} ref={resultsRef}>
        <div className="browse-intro browse-intro--with-create">
          <div className="browse-intro-copy">
            <h1>{text.heroTitle}</h1>
            <p>{text.heroDescription}</p>
          </div>
          <Link className="browse-create-button ui-button ui-button--lg" href="/services/create">
            <i className="ms ms-add" aria-hidden="true" />
            <span>{t("createServiceAction")}</span>
          </Link>
        </div>

        <MobileBrowseCategoryRail
          ariaLabel={text.serviceType}
          className="services-mobile-category-rail"
          activeValue={activeCategory}
          onSelect={(value) => chooseCategory(value as ServiceCategoryId | "all")}
          items={[{ value: "all", label: t("all"), icon: "ms-grid-view", tone: "services-category-all" }, ...serviceCategories.map(({ id, icon }) => ({ value: id, label: categoryLabels[id], icon, tone: `services-category-${id}` }))]}
        />

        <div className="services-category-grid" role="group" aria-label={text.serviceType}>
          {serviceCategories.map(({ id, icon }) => (
            <button key={id} className={activeCategory === id ? "services-category is-active" : "services-category"} type="button" aria-pressed={activeCategory === id} onClick={() => chooseCategory(activeCategory === id ? "all" : id)}>
              <span><i className={`ms ${icon}`} aria-hidden="true" /></span>
              <strong>{categoryLabels[id]}</strong>
            </button>
          ))}
        </div>

        <BrowseResultsToolbar
          viewMode="grid"
          onViewModeChange={() => undefined}
          showViewToggle={false}
          chips={[
            { value: "all", label: t("all") },
            { value: "nearMe", label: text.quickFilters.nearMe },
          ]}
          activeChipValue={activeChip}
          onChipSelect={setActiveChip}
          chipStyle="sort"
          sortValue={sort}
          sortOptions={locale === "ko" ? [{ value: "recommended", label: "추천순" }, { value: "highest-rated", label: "평점 높은순" }, { value: "most-reviewed", label: "후기 많은순" }, { value: "newest", label: "최신순" }] : [{ value: "recommended", label: "Recommended" }, { value: "highest-rated", label: "Highest rated" }, { value: "most-reviewed", label: "Most reviewed" }, { value: "newest", label: "Newest" }]}
          onSortChange={setSort}
          sortDisplay="chips"
          resultsLabel={text.serviceCount(visibleServices.length)}
          combineChipsAndSort
        />

        <section className="services-sponsor-banner" aria-label={text.sponsored}>
          <div className="services-sponsor-copy"><span>{text.sponsored}</span><strong>{text.sponsorTitle}</strong><p>{text.sponsorDescription}</p></div>
          <ul>{text.benefits.map((benefit) => <li key={benefit}><i className="ms ms-check-circle" aria-hidden="true" /> {benefit}</li>)}</ul>
          <Image src={visibleServices[0]?.image ?? "/images/logo.png"} alt="" width={180} height={108} />
          <button type="button" onClick={() => setNotice(text.providerNotice)}>{text.learnMore}</button>
        </section>

        <div className="services-card-grid">
          {visibleServices.map((service) => {
            const listing = text.listings[service.id as keyof typeof text.listings];
            const location = service.location ?? listing?.location ?? "New Zealand";
            // Formatted here rather than on the server: it is the one field
            // that reads differently per language, and the list is shared.
            const storedPrice = service.priceFrom === null || service.priceFrom === undefined || !service.priceUnit
              ? undefined
              : serviceDetailsSummary(service.category, { price_from: String(service.priceFrom), price_unit: service.priceUnit }, locale)[0]?.value;
            const price = service.price ?? storedPrice ?? listing?.price ?? (locale === "ko" ? "가격 문의" : "Contact for pricing");
            const imageAlt = service.imageAlt ?? listing?.imageAlt ?? service.provider;
            // Verification is a listing-level trust mark; it still falls back to
            // the badge list so the seeded services keep their old behaviour.
            const isVerified = service.isVerified ?? service.badges.includes("verified");
            const displayBadges = service.badges;
            const reviewsLabel = locale === "ko" ? "후기" : service.reviewCount === 1 ? "review" : "reviews";
            return <article className="services-listing ui-card" key={service.id} tabIndex={0} role="link" onClick={(event) => { if (!(event.target as HTMLElement).closest("a, button")) router.push(`/services/${service.id}`); }} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/services/${service.id}`); }}>
              {!service.isOwner ? <ServiceSaveButton serviceId={service.id} provider={service.provider} initialIsSaved={service.isSaved} /> : null}
              <div className="services-listing-media"><Image src={service.image} alt={imageAlt} fill sizes="(max-width: 767.98px) 116px, (max-width: 1199.98px) 33vw, 400px" /></div>
              <div className="services-listing-body">
                <header className="services-listing-identity">
                  <span className="services-listing-logo">
                    {service.logo ? <Image src={service.logo} alt="" fill sizes="44px" /> : <i className="ms ms-storefront" aria-hidden="true" />}
                  </span>
                  <div className="services-listing-name">
                    <h3>
                      <span>{service.provider}</span>
                      {isVerified ? <i className="ms ms-verified services-listing-verified" role="img" aria-label={serviceBadgeLabel("verified", locale)} /> : null}
                    </h3>
                    <p className="services-listing-category">{categoryLabels[service.category]}</p>
                  </div>
                </header>
                <div className="services-listing-meta">
                  <span className="services-listing-rating">
                    <i className="ms ms-star" aria-hidden="true" />
                    <b>{service.rating.toFixed(1)}</b>
                    <span>({service.reviewCount} {reviewsLabel})</span>
                  </span>
                  <span className="services-listing-place"><i className="ms ms-location-on" aria-hidden="true" /><span>{location}</span></span>
                </div>
                <div className="services-listing-badges">
                  {displayBadges.slice(0, 3).map((badge) => <span className={`service-badge is-${badge}`} key={badge}>{serviceBadgeLabel(badge, locale)}</span>)}
                  {displayBadges.length > 3 ? <span className="service-badge service-badge-more">+{displayBadges.length - 3}</span> : null}
                </div>
                <p className="services-listing-price"><strong>{price}</strong></p>
                <div className="services-listing-controls">
                  <ServiceCallControl phone={service.phone} providerName={service.provider} isKorean={locale === "ko"} />
                  <button className="ui-button ui-button--primary services-listing-message" type="button" onClick={() => setNotice(`${text.message}: ${service.provider}`)}><i className="ms ms-chat" aria-hidden="true" /> {text.message}</button>
                </div>
              </div>
            </article>;
          })}
        </div>

        {notice ? <p className="services-notice" role="status">{notice}</p> : null}

        <section className="services-request-cta ui-card" aria-labelledby="services-request-title">
          <span className="services-request-icon"><i className="ms ms-assignment" aria-hidden="true" /></span>
          <div><p>{text.requestEyebrow}</p><h2 id="services-request-title">{text.requestTitle}</h2><span>{text.requestDescription}</span></div>
          <Button pill onClick={() => setNotice(text.requestNotice)}><i className="ms ms-add" aria-hidden="true" /> {text.requestAction}</Button>
        </section>
      </section>

      <aside className="services-side-rail" aria-label={text.whyTadaServices}>
        {/* The space is for sale, and says so, rather than dressing a
            placeholder up as a service of our own. */}
        <section className="services-ad-invite ui-card">
          <span className="ui-pill">{text.adInviteLabel}</span>
          <i className="ms ms-campaign" aria-hidden="true" />
          <h2>{text.adInviteTitle}</h2>
          <p>{text.adInviteDescription}</p>
          <button type="button" onClick={() => setNotice(text.adInviteNotice)}>{text.adInviteAction} <i className="ms ms-arrow-forward" aria-hidden="true" /></button>
        </section>
        <section className="services-side-ad" aria-label={text.sidebarAdLabel}>
          <Image src="/images/home/journey-services.png" alt="" fill sizes="(max-width: 1199px) 100vw, 284px" />
          <div className="services-side-ad-content">
            <span>{text.sidebarAdLabel}</span>
            <strong>{text.sidebarAdTitle}</strong>
            <p>{text.sidebarAdDescription}</p>
            <button type="button" onClick={() => chooseCategory("cleaning")}>{text.sidebarAdAction} <i className="ms ms-arrow-forward" aria-hidden="true" /></button>
          </div>
        </section>
      </aside>
    </main>
  );
}
