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
import { ListSearchField } from "@/components/ui/ListSearchField";
import { type MainLocation } from "@/data/nzLocations";
import { serviceBadgeLabel, serviceDetailsSummary, serviceCategories, servicesCategoryLabels, servicesText, type ServiceCategoryId, type ServiceListing } from "@/data/services";
import { ServiceSaveButton } from "@/components/services/ServiceSaveButton";
import { AdSlot } from "@/components/advertising/AdSlot";
import { scrollToListTop } from "@/lib/scroll-to-list-top";
import { useProfileMainLocation } from "@/lib/market/useProfileMainLocation";
import { searchWithProfileArea } from "@/lib/market/starting-area";
import { serviceFeedResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import type { ServicesFeedQuery, ServicesFeedResult } from "@/lib/services/feed";

const defaultFilters: ServiceFilterState = { providerType: "all", highlyRated: false };
const FEED_CACHE_TTL_MS = 30_000;

/** The feed request a browse URL stands for; doubles as the cache key. */
const buildFeedQuery = ({ category, mainLocation, subLocation }: ServicesFeedQuery) => {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (mainLocation) params.set("mainLocation", mainLocation);
  if (subLocation) params.set("subLocation", subLocation);
  return params.toString();
};

export function ServicesPageClient({ initialFeed = null, initialQuery, profileLocationDefault }: { initialFeed?: ServicesFeedResult | null; initialQuery?: ServicesFeedQuery; profileLocationDefault?: MainLocation | "" } = {}) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = servicesText(locale);
  const categoryLabels = servicesCategoryLabels(locale);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [filters, setFilters] = useState<ServiceFilterState>(defaultFilters);
  const [notice, setNotice] = useState("");
  const [feedError, setFeedError] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [isSearchToolsVisible, setIsSearchToolsVisible] = useState(true);
  const searchToolsScrollRef = useRef({ previousY: 0, downwardDistance: 0 });
  const searchToolsRef = useRef<HTMLDivElement>(null);
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
  // A visit with no area on the address starts on the profile's area. The server has
  // already drawn the list for it, so the screen says so from the first render and the
  // address bar catches up below; a later real navigation brings its own address.
  const urlSearch = searchParams.toString();
  const defaultedSearch = searchWithProfileArea(urlSearch, profileLocationDefault);
  const activeSearch = pushedSearch ?? defaultedSearch ?? urlSearch;
  const activeParams = useMemo(() => new URLSearchParams(activeSearch), [activeSearch]);
  const requestedCategory = activeParams.get("category");
  const activeCategory: ServiceCategoryId | "all" = serviceCategories.some(({ id }) => id === requestedCategory) ? requestedCategory as ServiceCategoryId : "all";
  const mainLocation = (activeParams.get("mainLocation") ?? "") as MainLocation | "";
  const subLocation = activeParams.get("subLocation") ?? "";
  const searchTerm = (activeParams.get("q") ?? "").trim().toLocaleLowerCase(locale);
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
      setFeedError(false);
      setIsLoadingServices(false);
      return;
    }
    const controller = new AbortController();
    setIsLoadingServices(true);
    setFeedError(false);
    void fetch(`/api/services/listings?${feedQuery}`, { signal: controller.signal })
      .then((response) => readApiResponse(response, serviceFeedResponseSchema))
      .then((result) => {
        if (!result.data) throw new Error("Service feed unavailable");
        const nextFeed = result.data as ServicesFeedResult;
        feedCache.current.set(feedQuery, { feed: nextFeed, cachedAt: Date.now() });
        setFeed(nextFeed);
        setFeedError(false);
      })
      .catch(() => { if (!controller.signal.aborted) setFeedError(true); })
      .finally(() => { if (!controller.signal.aborted) setIsLoadingServices(false); });
    return () => controller.abort();
  }, [feedQuery, feedRefreshKey, initialFeed, initialQuery]);

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
  // Keep search controls reachable without letting them occupy the screen
  // throughout a long browse. They hide after a quarter-screen of downward
  // travel; any upward movement brings them back immediately.
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    const searchTools = searchToolsRef.current;
    if (!header || !searchTools) return;

    const syncHeaderOffset = () => searchTools.style.setProperty("--services-sticky-header-offset", `${header.getBoundingClientRect().height}px`);
    syncHeaderOffset();
    const observer = new ResizeObserver(syncHeaderOffset);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const handleScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      const scrollState = searchToolsScrollRef.current;
      const delta = currentY - scrollState.previousY;
      const searchTools = searchToolsRef.current;
      const focusedInsideSearch = searchTools?.contains(document.activeElement) ?? false;

      if (currentY === 0 || focusedInsideSearch) {
        scrollState.downwardDistance = 0;
        setIsSearchToolsVisible(true);
      } else if (delta < 0) {
        scrollState.downwardDistance = 0;
        setIsSearchToolsVisible(true);
      } else if (delta > 0) {
        scrollState.downwardDistance += delta;
        if (scrollState.downwardDistance >= window.innerHeight * 0.25) setIsSearchToolsVisible(false);
      }

      scrollState.previousY = currentY;
    };

    searchToolsScrollRef.current.previousY = Math.max(0, window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  // The category and the area are part of the request now, so what is left
  // here is the handful of flags the rail toggles without a round trip.
  const visibleServices = useMemo(() => {
    const matches = feed.services.filter((service) => (filters.providerType === "all" || service.providerType === filters.providerType)
      && (!filters.highlyRated || (service.reviewCount > 0 && service.rating >= 4.5))
      && (!searchTerm || [service.provider, service.businessName, service.description, categoryLabels[service.category], service.location, ...(service.serviceAreas ?? []), ...(service.suburbs ?? [])].some((value) => value?.toLocaleLowerCase(locale).includes(searchTerm))));
    return [...matches].sort((a, b) => sort === "highest-rated" ? (b.reviewCount ? b.rating : 0) - (a.reviewCount ? a.rating : 0) || b.reviewCount - a.reviewCount : sort === "most-reviewed" ? b.reviewCount - a.reviewCount : sort === "newest" ? Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "") || 0 : b.rating * b.reviewCount - a.rating * a.reviewCount);
  }, [feed, filters, sort, searchTerm, categoryLabels, locale]);

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
    // The server has already answered, with an area or with none. Asking again from the
    // browser is the second load this page used to make.
    enabled: profileLocationDefault === undefined,
    hasMainLocationInUrl: activeParams.has("mainLocation") || activeParams.has("subLocation"),
    mainLocation,
    onResolve: (profileMainLocation) => chooseLocation(profileMainLocation, "", { replace: true }),
  });
  // The address still reads /services while the screen is on the profile's area, and every
  // filter built from the address bar would drop it. Writing it back changes no list: its
  // key is the one the server's list is cached under.
  useEffect(() => {
    if (!defaultedSearch || !profileLocationDefault) return;
    chooseLocation(profileLocationDefault, "", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        <div ref={searchToolsRef} className={`services-discovery-tools is-sticky-search${isSearchToolsVisible ? " is-visible" : " is-hidden"}`} aria-hidden={!isSearchToolsVisible} inert={!isSearchToolsVisible}>
          <ListSearchField placeholder={locale === "ko" ? "서비스 검색" : "Search services"} label={locale === "ko" ? "서비스 목록 검색" : "Search services"} submitLabel={locale === "ko" ? "검색" : "Search"} submitInField />
          <button className="services-location-button ui-button ui-button--secondary" type="button" onClick={() => setIsFilterOpen(true)} aria-label={locale === "ko" ? "서비스 지역 선택" : "Choose service area"}>
            <i className="ms ms-location-on" aria-hidden="true" />
            <span>{subLocation || mainLocation || (locale === "ko" ? "NZ 전체" : "All NZ")}</span>
            <i className="ms ms-expand-more" aria-hidden="true" />
          </button>
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
          sortValue={sort}
          sortOptions={locale === "ko" ? [{ value: "recommended", label: "추천순" }, { value: "highest-rated", label: "평점 높은순" }, { value: "most-reviewed", label: "후기 많은순" }, { value: "newest", label: "최신순" }] : [{ value: "recommended", label: "Recommended" }, { value: "highest-rated", label: "Highest rated" }, { value: "most-reviewed", label: "Most reviewed" }, { value: "newest", label: "Newest" }]}
          onSortChange={setSort}
          sortDisplay="chips"
          resultsLabel={text.serviceCount(visibleServices.length)}
        />

        {filters.providerType !== "all" || filters.highlyRated ? <div className="services-applied-filters" aria-label={locale === "ko" ? "적용된 필터" : "Applied filters"}>
          {filters.providerType !== "all" ? <button type="button" onClick={() => setFilters((current) => ({ ...current, providerType: "all" }))}>{filters.providerType === "businesses" ? text.businesses : text.individuals} <i className="ms ms-close" aria-hidden="true" /></button> : null}
          {filters.highlyRated ? <button type="button" onClick={() => setFilters((current) => ({ ...current, highlyRated: false }))}>{locale === "ko" ? "평점 4.5 이상" : "Rated 4.5+"} <i className="ms ms-close" aria-hidden="true" /></button> : null}
        </div> : null}

        {isLoadingServices ? <p className="services-list-state" role="status">{locale === "ko" ? "서비스를 불러오는 중이에요…" : "Loading services…"}</p> : null}
        {feedError ? <div className="services-list-state" role="alert"><p>{locale === "ko" ? "서비스를 불러오지 못했어요." : "Could not load services."}</p><button className="ui-button ui-button--secondary" type="button" onClick={() => setFeedRefreshKey((value) => value + 1)}>{locale === "ko" ? "다시 시도" : "Try again"}</button></div> : null}
        {!isLoadingServices && !feedError && !visibleServices.length ? <div className="services-list-state" role="status"><p>{locale === "ko" ? "조건에 맞는 서비스가 없어요." : "No services match these choices."}</p><button className="ui-button ui-button--secondary" type="button" onClick={() => { setFilters(defaultFilters); setSort("recommended"); const params = new URLSearchParams(window.location.search); params.delete("q"); params.delete("category"); params.delete("mainLocation"); params.delete("subLocation"); applyBrowseParams(params); }}>{locale === "ko" ? "조건 초기화" : "Clear filters"}</button></div> : null}
        {!isLoadingServices && !feedError ? <div className="services-card-grid">
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
            const isVerified = service.isVerified === true;
            const displayBadges = service.badges;
            const reviewsLabel = locale === "ko" ? "후기" : service.reviewCount === 1 ? "review" : "reviews";
            return <article className="services-listing ui-card" key={service.id} tabIndex={0} role="link" aria-label={`${locale === "ko" ? "서비스 보기" : "View service"}: ${service.provider}`} onClick={(event) => { if (!(event.target as HTMLElement).closest("a, button")) router.push(`/services/${service.id}`); }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); router.push(`/services/${service.id}`); } }}>
              {!service.isOwner ? <ServiceSaveButton serviceId={service.id} provider={service.provider} initialIsSaved={service.isSaved} /> : null}
              <div className="services-listing-media"><Image src={service.image} alt={imageAlt} fill sizes="(max-width: 767.98px) 96px, (max-width: 1199.98px) 33vw, 400px" /></div>
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
                    <p className="services-listing-category">{categoryLabels[service.category]}{service.businessName && service.businessName !== service.provider ? ` · ${service.businessName}` : ""}</p>
                  </div>
                </header>
                <div className="services-listing-meta">
                  {service.reviewCount > 0 ? <span className="services-listing-rating">
                    <i className="ms ms-star" aria-hidden="true" />
                    <b>{service.rating.toFixed(1)}</b>
                    <span>({service.reviewCount} {reviewsLabel})</span>
                  </span> : null}
                  <span className="services-listing-place"><i className="ms ms-location-on" aria-hidden="true" /><span>{location}</span></span>
                </div>
                {displayBadges.length ? <div className="services-listing-badges">
                  {displayBadges.slice(0, 3).map((badge) => <span className={`service-badge is-${badge}`} key={badge}>{serviceBadgeLabel(badge, locale)}</span>)}
                  {displayBadges.length > 3 ? <span className="service-badge service-badge-more">+{displayBadges.length - 3}</span> : null}
                </div> : null}
                <p className="services-listing-price"><strong>{price}</strong></p>
              </div>
            </article>;
          })}
        </div> : null}

        {notice ? <p className="services-notice" role="status">{notice}</p> : null}
      </section>

      <aside className="services-side-rail" aria-label={locale === "ko" ? "광고" : "Advertisement"}>
        <AdSlot placement="market_sidebar" />
      </aside>
    </main>
  );
}
