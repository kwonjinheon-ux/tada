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
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ServiceSaveButton } from "@/components/services/ServiceSaveButton";

const defaultFilters: ServiceFilterState = { providerType: "all", availability: "all", verified: false, highlyRated: false, fastResponder: false };

export function ServicesPageClient() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = servicesText(locale);
  const categoryLabels = servicesCategoryLabels(locale);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ServiceCategoryId | "all">("all");
  const [activeChip, setActiveChip] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [mainLocation, setMainLocation] = useState<MainLocation | "">("");
  const [subLocation, setSubLocation] = useState("");
  const [filters, setFilters] = useState<ServiceFilterState>(defaultFilters);
  const [notice, setNotice] = useState("");
  const [databaseServices, setDatabaseServices] = useState<ServiceListing[] | null>(null);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (searchParams.get("submitted") === "pending") {
      setNotice(locale === "ko" ? "서비스 등록 신청이 접수되었습니다. 검토가 완료되면 공개됩니다." : "Your service listing was submitted and is awaiting review.");
    }
  }, [locale, searchParams]);

  useEffect(() => {
    let isCurrent = true;
    void (async () => {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("service_listings")
        .select("id,owner_id,category_slug,provider_name,description,phone,provider_type,service_areas,rating,review_count,price_from,price_unit,created_at,service_listing_photos(storage_path,display_order,photo_kind)")
        .order("created_at", { ascending: false });
      if (error || !data || !isCurrent) return;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: savedRows } = user
        ? await supabase.from("service_wishlist").select("service_id").eq("user_id", user.id)
        : { data: [] as Array<{ service_id: string }> };
      const savedServiceIds = new Set((savedRows ?? []).map((row) => row.service_id));

      const photoPaths = data.flatMap((listing) => (listing.service_listing_photos ?? []).map((photo) => photo.storage_path));
      const { data: signedPhotos } = photoPaths.length
        ? await supabase.storage.from("service-listing-images").createSignedUrls(photoPaths, 60 * 60)
        : { data: [] };
      if (!isCurrent) return;

      const signedByPath = new Map((signedPhotos ?? []).filter((photo) => photo.path && photo.signedUrl).map((photo) => [photo.path, photo.signedUrl]));
      setDatabaseServices(data.map((listing) => {
        const photos = [...(listing.service_listing_photos ?? [])].sort((left, right) => left.display_order - right.display_order);
        const logoPhoto = photos.find((photo) => photo.photo_kind === "logo");
        const galleryPhoto = photos.find((photo) => photo.photo_kind !== "logo");
        const cardPhoto = logoPhoto ?? galleryPhoto;
        const image = cardPhoto?.storage_path ? signedByPath.get(cardPhoto.storage_path) : undefined;
        return {
          id: listing.id,
          isOwner: listing.owner_id === user?.id,
          isSaved: savedServiceIds.has(listing.id),
          category: listing.category_slug as ServiceCategoryId,
          badges: listing.rating >= 4.5 ? ["highlyRated"] : ["new"],
          provider: listing.provider_name,
          description: listing.description,
          phone: listing.phone,
          providerType: listing.provider_type === "business" ? "businesses" : "individuals",
          availability: "this-week",
          rating: Number(listing.rating),
          reviewCount: listing.review_count,
          image: image ?? "/images/home/journey-services.png",
          location: listing.service_areas[0] ?? "New Zealand",
          price: listing.price_from === null || !listing.price_unit ? (locale === "ko" ? "가격 문의" : "Contact for pricing") : serviceDetailsSummary(listing.category_slug as ServiceCategoryId, { price_from: String(listing.price_from), price_unit: listing.price_unit }, locale)[0]?.value ?? (locale === "ko" ? "가격 문의" : "Contact for pricing"),
          imageAlt: listing.provider_name,
        } satisfies ServiceListing;
      }));
    })();
    return () => { isCurrent = false; };
  }, [locale]);

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
  const visibleServices = useMemo(() => {
    const sourceServices = databaseServices ?? [];
    const matches = sourceServices.filter((service) => (activeCategory === "all" || service.category === activeCategory)
      && (filters.providerType === "all" || service.providerType === filters.providerType)
      && (filters.availability === "all" || service.availability === filters.availability)
      && (!filters.verified || service.badges.includes("verified"))
      && (!filters.highlyRated || service.badges.includes("highlyRated"))
      && (!filters.fastResponder || service.badges.includes("fastResponder")));
    return [...matches].sort((a, b) => sort === "highest-rated" ? b.rating - a.rating || b.reviewCount - a.reviewCount : sort === "most-reviewed" ? b.reviewCount - a.reviewCount : sort === "newest" ? Number(b.badges.includes("new")) - Number(a.badges.includes("new")) : b.rating * b.reviewCount - a.rating * a.reviewCount);
  }, [activeCategory, databaseServices, filters, sort]);

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
            const price = service.price ?? listing?.price ?? (locale === "ko" ? "가격 문의" : "Contact for pricing");
            const imageAlt = service.imageAlt ?? listing?.imageAlt ?? service.provider;
            const description = service.description ?? `${categoryLabels[service.category]} ${locale === "ko" ? "서비스를 제공합니다." : "services from a local provider."}`;
            const isVerified = service.badges.includes("verified");
            return <article className="services-listing ui-card" key={service.id} tabIndex={0} role="link" onClick={(event) => { if (!(event.target as HTMLElement).closest("a, button")) router.push(`/services/${service.id}`); }} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/services/${service.id}`); }}>
              {!service.isOwner ? <ServiceSaveButton serviceId={service.id} provider={service.provider} initialIsSaved={service.isSaved} /> : null}
              <span className="services-listing-recommended">{text.recommendedProvider}</span>
              <div className="services-listing-top">
                <div className="services-listing-image"><Image src={service.image} alt={imageAlt} fill sizes="64px" /></div>
                <div className="services-listing-copy">
                  <header>
                    <div>
                      <h3>{service.provider}{isVerified ? <i className="ms ms-verified-user" aria-label={serviceBadgeLabel("verified", locale)} /> : null}</h3>
                      <p className="services-listing-category">{categoryLabels[service.category]}</p>
                    </div>
                    <a className="services-listing-call" href={`tel:${service.phone.replace(/\s/g, "")}`} aria-label={`${service.provider}: ${service.phone}`}>
                      <i className="ms ms-call" aria-hidden="true" />
                    </a>
                  </header>
                </div>
              </div>
                <div className="services-listing-details">
                <div className="services-listing-contact">
                  <span className="services-listing-phone"><i className="ms ms-call" aria-hidden="true" /> {service.phone}</span>
                  <span><i className="ms ms-location-on" aria-hidden="true" /> {location}</span>
                </div>
                <p className="services-listing-description">{description}</p>
                <div className="services-listing-meta">
                  <span><i className="ms ms-star" aria-hidden="true" /> {service.rating.toFixed(1)} ({service.reviewCount} {locale === "ko" ? "후기" : "reviews"})</span>
                </div>
                <div className="services-listing-badges">
                  {service.badges.slice(0, 3).map((badge) => <span className={`service-badge is-${badge}`} key={badge}>{serviceBadgeLabel(badge, locale)}</span>)}
                  {service.badges.length > 3 ? <span className="service-badge service-badge-more">+{service.badges.length - 3}</span> : null}
                </div>
                <div className="services-listing-actions">
                  <strong>{price}</strong>
                  <button type="button" onClick={() => router.push(`/services/${service.id}`)}>{locale === "ko" ? "상세 보기" : "View details"}</button>
                  <button type="button" onClick={() => setNotice(`${text.message}: ${service.provider}`)}><i className="ms ms-chat" aria-hidden="true" /> {text.message}</button>
                </div>
              </div>
              <button className="services-listing-details-link" type="button" onClick={() => router.push(`/services/${service.id}`)}>{locale === "ko" ? "상세 보기" : "View details"}<i className="ms ms-arrow-forward" aria-hidden="true" /></button>
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
        <section className="services-provider-promo ui-card">
          <span className="ui-pill">{text.providerLabel}</span>
          <i className="ms ms-show-chart" aria-hidden="true" />
          <h2>{text.providerTitle}</h2>
          <p>{text.providerDescription}</p>
          <button type="button" onClick={() => setNotice(text.providerNotice)}>{text.providerAction} <i className="ms ms-arrow-forward" aria-hidden="true" /></button>
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
