"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { ServicesFilterSidebar, type ServiceFilterState } from "@/components/services/ServicesFilterSidebar";
import { ServiceCardPreview } from "@/components/services/ServiceCardPreview";
import { ServiceReviewDialog } from "@/components/services/ServiceReviewDialog";
import { ServiceOwnerActions } from "@/components/services/ServiceOwnerActions";
import { serviceBadgeLabel, serviceDetailFields, serviceDetailsSummary, services, servicesCategoryLabels, type ServiceBadge, type ServiceCategoryId } from "@/data/services";
import type { MainLocation } from "@/data/nzLocations";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ServiceProfile = {
  id: string; ownerId: string | null; provider: string; businessName: string; category: ServiceCategoryId; description: string;
  providerType: "business" | "sole_trader"; serviceAreas: string[]; suburbs: string[];
  phone: string; email: string | null; website: string | null; streetAddress: string | null;
  weekdayHours: string | null; saturdayHours: string | null; sundayHours: string | null;
  foundedYear: number | null; serviceSummary: string | null; languages: string[]; addressVisibility: "area" | "exact";
  rating: number; reviewCount: number; priceFrom: number | null;
  priceUnit: string | null; serviceDetails: Record<string, unknown>; logo: string | null;
  images: string[]; badges: ServiceBadge[];
};

function previewProfile(serviceId: string, isKorean: boolean): ServiceProfile | null {
  const service = services.find((item) => item.id === serviceId);
  if (!service) return null;
  return {
    id: service.id, ownerId: null, provider: service.provider, businessName: service.provider, category: service.category,
    description: isKorean ? "지역 고객에게 믿을 수 있는 서비스를 제공하는 Tada 서비스 제공자입니다. 필요한 내용을 편하게 문의해 주세요." : "A trusted local Tada provider ready to help with your next job. Get in touch to discuss what you need.",
    providerType: service.providerType === "businesses" ? "business" : "sole_trader",
    serviceAreas: ["Hamilton"], suburbs: [], phone: service.phone, email: null, website: null,
    streetAddress: null, weekdayHours: null, saturdayHours: null, sundayHours: null,
    foundedYear: null, serviceSummary: null, languages: [], addressVisibility: "area", rating: service.rating, reviewCount: service.reviewCount, priceFrom: null,
    priceUnit: null, serviceDetails: {}, logo: null, images: [service.image], badges: service.badges,
  };
}

function ServiceProfileContactCard({
  profile, location, directionsHref, websiteHref, categoryLabel, isKorean,
}: {
  profile: ServiceProfile; location: string; directionsHref: string | null; websiteHref: string | null;
  categoryLabel: string; isKorean: boolean;
}) {
  return (
    <section className="service-profile-contact ui-card">
      <div className="service-profile-contact-actions">
        <a className="ui-button ui-button--primary" href={`sms:${profile.phone.replace(/\s/g, "")}`}><i className="ms ms-chat" aria-hidden="true" /> {isKorean ? "메시지" : "Message"}</a>
        <a className="ui-button ui-button--secondary" href={`tel:${profile.phone.replace(/\s/g, "")}`}><i className="ms ms-call" aria-hidden="true" /> {isKorean ? "전화하기" : "Call now"}</a>
      </div>
      <header className="service-profile-contact-header">
        {profile.logo ? <img className="service-profile-contact-logo" src={profile.logo} alt={`${profile.businessName} logo`} /> : (
          <span className="service-profile-contact-logo service-profile-contact-logo--fallback" aria-hidden="true"><i className="ms ms-work" /></span>
        )}
        <div>
          <h2>{profile.businessName}</h2>
          <span>{categoryLabel}</span>
        </div>
      </header>
      <p><i className="ms ms-location-on" aria-hidden="true" /> {location}</p>
      {profile.streetAddress ? <p><i className="ms ms-my-location" aria-hidden="true" /> {profile.streetAddress}</p> : null}
      {directionsHref ? <a className="ui-button ui-button--primary service-profile-directions" href={directionsHref} target="_blank" rel="noreferrer"><i className="ms ms-directions" aria-hidden="true" /> {isKorean ? "길찾기" : "Get directions"}</a> : null}
      <p><i className="ms ms-work" aria-hidden="true" /> {profile.providerType === "business" ? (isKorean ? "지역 업체" : "Local business") : (isKorean ? "개인 사업자" : "Sole trader")}</p>
      <p><i className="ms ms-call" aria-hidden="true" /> <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>{profile.phone}</a></p>
      {profile.email ? <p><i className="ms ms-mail" aria-hidden="true" /> <a href={`mailto:${profile.email}`}>{profile.email}</a></p> : null}
      {websiteHref ? <p><i className="ms ms-open-in-new" aria-hidden="true" /> <a href={websiteHref} target="_blank" rel="noreferrer">{isKorean ? "웹사이트 방문" : "Visit website"}</a></p> : null}
    </section>
  );
}

export function ServiceProfileClient({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const isKorean = locale === "ko";
  const labels = servicesCategoryLabels(locale);
  const [profile, setProfile] = useState<ServiceProfile | null>(() => previewProfile(serviceId, isKorean));
  const [isLoading, setIsLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [mainLocation, setMainLocation] = useState<MainLocation | "">("");
  const [subLocation, setSubLocation] = useState("");
  const [filters, setFilters] = useState<ServiceFilterState>({ providerType: "all", availability: "all", verified: false, highlyRated: false, fastResponder: false });
  const [activeSection, setActiveSection] = useState<"about" | "details" | "gallery" | "area">("about");
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    void (async () => {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) { if (isCurrent) setIsLoading(false); return; }
      const { data, error } = await supabase
        .from("service_listings")
        .select("id,owner_id,category_slug,provider_name,business_name,description,provider_type,service_areas,suburbs,phone,email,website,street_address,weekday_hours,saturday_hours,sunday_hours,founded_year,service_summary,languages,address_visibility,rating,review_count,price_from,price_unit,service_details,service_listing_photos(storage_path,display_order,photo_kind)")
        .eq("id", serviceId).maybeSingle();
      if (error || !data || !isCurrent) { if (isCurrent) setIsLoading(false); return; }
      const photos = [...(data.service_listing_photos ?? [])].sort((left, right) => left.display_order - right.display_order);
      const photoPaths = photos.map((photo) => photo.storage_path);
      const { data: signedPhotos } = photoPaths.length ? await supabase.storage.from("service-listing-images").createSignedUrls(photoPaths, 60 * 60) : { data: [] };
      if (!isCurrent) return;
      const urlsByPath = new Map((signedPhotos ?? []).filter((photo) => photo.path && photo.signedUrl).map((photo) => [photo.path, photo.signedUrl]));
      const logoPath = photos.find((photo) => photo.photo_kind === "logo")?.storage_path;
      const galleryPaths = photos.filter((photo) => photo.photo_kind !== "logo").map((photo) => photo.storage_path);
      const { data: { user } } = await supabase.auth.getUser();
      setViewerId(user?.id ?? null);
      setProfile({
        id: data.id, ownerId: data.owner_id, provider: data.provider_name, businessName: data.business_name ?? data.provider_name, category: data.category_slug as ServiceCategoryId,
        description: data.description, providerType: data.provider_type, serviceAreas: data.service_areas ?? [],
        suburbs: data.suburbs ?? [], phone: data.phone, email: data.email, website: data.website,
        streetAddress: data.street_address, weekdayHours: data.weekday_hours, saturdayHours: data.saturday_hours,
        sundayHours: data.sunday_hours, foundedYear: data.founded_year, serviceSummary: data.service_summary,
        languages: data.languages ?? [], addressVisibility: data.address_visibility === "exact" ? "exact" : "area", rating: Number(data.rating),
        reviewCount: data.review_count, priceFrom: data.price_from === null ? null : Number(data.price_from),
        priceUnit: data.price_unit, serviceDetails: data.service_details && typeof data.service_details === "object" && !Array.isArray(data.service_details) ? data.service_details : {},
        logo: logoPath ? urlsByPath.get(logoPath) ?? null : null,
        images: galleryPaths.map((path) => urlsByPath.get(path)).filter((url): url is string => Boolean(url)),
        badges: Number(data.rating) >= 4.5 ? ["highlyRated"] : ["new"],
      });
      setIsLoading(false);
    })();
    return () => { isCurrent = false; };
  }, [serviceId]);

  if (isLoading && !profile) return <main className="service-profile-page"><p className="service-profile-loading">{isKorean ? "서비스 정보를 불러오는 중…" : "Loading service profile…"}</p></main>;
  if (!profile) return <main className="service-profile-page"><section className="service-profile-empty ui-card"><h1>{isKorean ? "서비스를 찾을 수 없습니다." : "Service not found."}</h1><p>{isKorean ? "삭제되었거나 공개되지 않은 서비스입니다." : "This service is no longer available or has not been published."}</p><Link className="ui-button ui-button--primary" href="/services">{isKorean ? "서비스 목록으로" : "Back to services"}</Link></section></main>;

  const location = [...profile.suburbs, ...profile.serviceAreas].filter(Boolean).join(", ") || (isKorean ? "뉴질랜드" : "New Zealand");
  const publicStreetAddress = profile.addressVisibility === "exact" ? profile.streetAddress : null;
  const heroImage = profile.logo ?? profile.images[0];
  const websiteHref = profile.website?.startsWith("http") ? profile.website : profile.website ? `https://${profile.website}` : null;
  const directionsHref = publicStreetAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${publicStreetAddress}, ${location}`)}` : null;
  const serviceFields = serviceDetailFields(profile.category, locale);
  const serviceOptionRecords = Array.isArray(profile.serviceDetails.services)
    ? profile.serviceDetails.services.filter((service): service is Record<string, unknown> => Boolean(service) && typeof service === "object" && !Array.isArray(service))
    : [{ ...profile.serviceDetails, ...(profile.priceFrom !== null ? { price_from: String(profile.priceFrom) } : {}), ...(profile.priceUnit ? { price_unit: profile.priceUnit } : {}) }];
  const serviceTitleField = serviceFields.find((field) => field.key === "service_type") ?? serviceFields.find((field) => field.key !== "price_from" && field.key !== "price_unit");
  const servicePricingRows = serviceOptionRecords.map((service, index) => {
    const summary = serviceDetailsSummary(profile.category, service, locale);
    const rawTitle = serviceTitleField ? service[serviceTitleField.key] : null;
    const title = typeof rawTitle === "string" && rawTitle ? serviceTitleField?.options?.find((option) => option.value === rawTitle)?.label ?? rawTitle : `${isKorean ? "서비스" : "Service"} ${index + 1}`;
    const price = summary.find(({ label }) => label === (isKorean ? "가격" : "Price"))?.value ?? (isKorean ? "가격 문의" : "Price on request");
    const details = summary.filter(({ label }) => label !== (isKorean ? "가격" : "Price") && label !== serviceTitleField?.label).map(({ value }) => value).join(" · ");
    return { title, details: details || (isKorean ? "상세 정보 문의" : "Contact for details"), price };
  });
  const priceLabel = servicePricingRows[0]?.price ?? null;
  const businessContactDetails = [
    { icon: "ms-work", label: isKorean ? "제공자 유형" : "Provider type", value: profile.providerType === "business" ? (isKorean ? "지역 업체" : "Local business") : (isKorean ? "개인 사업자" : "Sole trader") },
    profile.phone ? { icon: "ms-call", label: isKorean ? "전화" : "Phone", value: profile.phone } : null,
    profile.email ? { icon: "ms-mail", label: isKorean ? "이메일" : "Email", value: profile.email } : null,
    profile.website ? { icon: "ms-language", label: isKorean ? "웹사이트" : "Website", value: profile.website.replace(/^https?:\/\//, "") } : null,
  ].filter((item): item is { icon: string; label: string; value: string } => Boolean(item));
  const openingHours = [
    profile.weekdayHours ? `${isKorean ? "평일" : "Mon – Fri"}   ${profile.weekdayHours}` : null,
    profile.saturdayHours ? `${isKorean ? "토요일" : "Saturday"}   ${profile.saturdayHours}` : null,
    profile.sundayHours ? `${isKorean ? "일요일·공휴일" : "Sunday"}   ${profile.sundayHours}` : null,
  ].filter((item): item is string => Boolean(item)).join("\n");
  const businessProfileDetails = [
    profile.foundedYear ? { icon: "ms-calendar-month", label: isKorean ? "설립" : "Established", value: String(profile.foundedYear) } : null,
    profile.languages.length ? { icon: "ms-language", label: isKorean ? "제공 언어" : "Languages spoken", value: profile.languages.join(", ") } : null,
    openingHours ? { icon: "ms-schedule", label: isKorean ? "운영 시간" : "Opening hours", value: openingHours } : null,
  ].filter((item): item is { icon: string; label: string; value: string } => Boolean(item));
  const hasServiceDetails = servicePricingRows.some((row) => row.details !== (isKorean ? "상세 정보 문의" : "Contact for details") || row.price !== (isKorean ? "가격 문의" : "Price on request"));
  const hasGallery = profile.images.length > 0;
  const basedIn = profile.serviceAreas[0] ?? location;
  const servedAreas = [...profile.suburbs, ...profile.serviceAreas].filter((area, index, list) => Boolean(area) && list.indexOf(area) === index && area !== basedIn);

  return (
    <main className="marketplace-page services-page service-profile-page">
      <aside className="market-filter-panel services-filter-rail service-profile-filter-rail" aria-label={isKorean ? "서비스 필터" : "Service filters"}>
        <ServicesFilterSidebar activeCategory={profile.category} onCategorySelect={() => router.push("/services")} mainLocation={mainLocation} subLocation={subLocation} onLocationChange={(nextMainLocation, nextSubLocation = "") => { setMainLocation(nextMainLocation); setSubLocation(nextSubLocation); }} filters={filters} onFilterChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))} onApply={() => undefined} compact />
      </aside>
      <section className="market-results services-results service-profile-main">
        <div className={`service-profile-shell is-section-${activeSection}`} onClick={(event) => {
          const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(".service-profile-tabs a");
          const section = link?.getAttribute("href")?.slice(1);
          if (section === "about" || section === "details" || section === "gallery" || section === "area") { event.preventDefault(); setActiveSection(section); }
        }}>
          <Link className="service-profile-back" href="/services"><i className="ms ms-arrow-back" aria-hidden="true" /> {isKorean ? "서비스로 돌아가기" : "Back to services"}</Link>
          <section className="service-profile-hero ui-card">
            <div className="service-profile-media">{heroImage ? <img src={heroImage} alt={`${profile.provider} ${isKorean ? "서비스 사진" : "service"}`} /> : <i className="ms ms-work" aria-hidden="true" />}</div>
            <div className="service-profile-hero-copy">
              <p>{labels[profile.category]} <span aria-hidden="true">·</span> {profile.providerType === "business" ? (isKorean ? "지역 업체" : "Local business") : (isKorean ? "개인 사업자" : "Sole trader")}</p>
              <h1><span>{profile.businessName}</span></h1>
              {profile.provider !== profile.businessName ? <strong className="service-profile-service-title">{profile.provider}</strong> : null}
              {profile.serviceSummary ? <p className="service-profile-summary">{profile.serviceSummary}</p> : null}
              <div className="services-listing-badges">{profile.badges.map((badge) => <span className={`service-badge is-${badge}`} key={badge}>{serviceBadgeLabel(badge, locale)}</span>)}</div>
              <div className="service-profile-rating"><i className="ms ms-star" aria-hidden="true" /> <strong>{profile.rating.toFixed(1)}</strong><span>({profile.reviewCount} {isKorean ? "후기" : "reviews"})</span></div>
              <div className="service-profile-keyfacts"><span><i className="ms ms-location-on" aria-hidden="true" /> {location}</span>{priceLabel ? <strong>{isKorean ? "최저 " : "From "}{priceLabel}</strong> : null}</div>
              <div className="service-profile-actions"><a className="ui-button ui-button--primary" href={`tel:${profile.phone.replace(/\s/g, "")}`}><i className="ms ms-call" aria-hidden="true" /> {isKorean ? "전화 문의" : "Call now"}</a>{profile.email ? <a className="ui-button ui-button--secondary" href={`mailto:${profile.email}`}><i className="ms ms-mail" aria-hidden="true" /> {isKorean ? "이메일" : "Email"}</a> : null}</div>
            </div>
          </section>
          <nav className="service-profile-tabs" aria-label={isKorean ? "서비스 정보" : "Service information"}><a href="#about" aria-current={activeSection === "about" ? "page" : undefined}>{isKorean ? "소개" : "About"}</a>{hasServiceDetails ? <a href="#details" aria-current={activeSection === "details" ? "page" : undefined}>{isKorean ? "서비스 및 가격" : "Services & pricing"}</a> : null}{hasGallery ? <a href="#gallery" aria-current={activeSection === "gallery" ? "page" : undefined}>{isKorean ? "작업 사진" : "Work gallery"}</a> : null}<a href="#area" aria-current={activeSection === "area" ? "page" : undefined}>{isKorean ? "서비스 지역" : "Service area"}</a></nav>
          <section className="service-profile-content">
            <article className="service-profile-section service-profile-about ui-card"><header><div><p className="service-profile-eyebrow">{isKorean ? "서비스 소개" : "About"}</p><h2>{isKorean ? "고객에게 제공하는 도움" : "How this provider can help"}</h2></div></header><p>{profile.description}</p>{businessContactDetails.length || businessProfileDetails.length ? <section className="service-profile-business-details" aria-label={isKorean ? "업체 정보" : "Business information"}><h3>{isKorean ? "업체 정보" : "Business information"}</h3><div className="service-profile-business-columns"><dl>{businessContactDetails.map(({ icon, label, value }) => <div key={label}><i className={`ms ${icon}`} aria-hidden="true" /><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</dl><dl>{businessProfileDetails.map(({ icon, label, value }) => <div key={label}><i className={`ms ${icon}`} aria-hidden="true" /><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</dl></div></section> : null}</article>
            {hasServiceDetails ? <article className="service-profile-section service-profile-pricing ui-card"><header><div><p className="service-profile-eyebrow">{isKorean ? "서비스 및 가격" : "Services & pricing"}</p><h2>{isKorean ? "제공 서비스와 가격" : "Service details & pricing"}</h2></div></header><div className="service-profile-price-table-wrap"><table className="service-profile-price-table"><thead><tr><th scope="col">{isKorean ? "서비스" : "Service"}</th><th scope="col">{isKorean ? "상세" : "Details"}</th><th scope="col">{isKorean ? "가격" : "Price"}</th><th scope="col"><span className="sr-only">{isKorean ? "상세 보기" : "View details"}</span></th></tr></thead><tbody>{servicePricingRows.map((row, index) => <tr key={`${row.title}-${index}`}><th scope="row">{row.title}</th><td>{row.details}</td><td>{row.price}</td><td aria-hidden="true"><i className="ms ms-chevron-right" /></td></tr>)}</tbody></table></div></article> : null}
            {hasGallery ? <article className="service-profile-section service-profile-gallery-section ui-card"><header><div><p className="service-profile-eyebrow">{isKorean ? "작업 사진" : "Work gallery"}</p><h2>{isKorean ? "최근 작업" : "Recent work"}</h2></div></header><div className="service-profile-gallery">{profile.images.map((image, index) => <img key={image} src={image} alt={`${profile.provider} ${index + 1}`} />)}</div></article> : null}
            <article className="service-profile-section service-profile-area ui-card"><header><div><p className="service-profile-eyebrow">{isKorean ? "서비스 지역" : "Service area"}</p><h2>{isKorean ? "서비스 가능 지역" : "Where this provider works"}</h2></div></header><div className="service-profile-area-layout"><div className="service-profile-area-details"><div><i className="ms ms-location-on" aria-hidden="true" /><dl><dt>{isKorean ? "기준 지역" : "Based in"}</dt><dd>{basedIn}</dd></dl></div><div><i className="ms ms-map" aria-hidden="true" /><dl><dt>{isKorean ? "서비스 제공 지역" : "Serves"}</dt><dd><span className="service-profile-area-chips">{(servedAreas.length ? servedAreas : [basedIn]).slice(0, 5).map((area) => <span key={area}>{area}</span>)}{servedAreas.length > 5 ? <span>+ {servedAreas.length - 5} {isKorean ? "곳" : "more"}</span> : null}</span></dd></dl></div></div><div className="service-profile-map" aria-label={location}><i className="ms ms-location-on" aria-hidden="true" /><span>{basedIn}</span></div></div></article>
            <article className="service-profile-section service-profile-reviews ui-card"><header className="service-profile-reviews-heading"><p className="service-profile-eyebrow">{isKorean ? "후기" : "Reviews"}</p><button className="service-review-open" type="button" onClick={() => setIsReviewOpen(true)}><i className="ms ms-star" aria-hidden="true" /> {isKorean ? "후기 등록하기" : "Write a review"}</button></header><div className="service-profile-review-summary"><strong>{profile.rating.toFixed(1)}</strong><span><i className="ms ms-star" aria-hidden="true" /> <i className="ms ms-star" aria-hidden="true" /> <i className="ms ms-star" aria-hidden="true" /> <i className="ms ms-star" aria-hidden="true" /> <i className="ms ms-star" aria-hidden="true" /></span><small>{profile.reviewCount} {isKorean ? "개의 후기" : "reviews"}</small></div><p>{isKorean ? "Tada의 실제 이용자 후기가 이곳에 표시됩니다." : "Reviews from local Tada customers appear here."}</p>{isReviewOpen ? <ServiceReviewDialog inline serviceId={profile.id} providerName={profile.provider} isKorean={isKorean} onClose={() => setIsReviewOpen(false)} onSubmitted={() => { setProfile((current) => current ? { ...current, reviewCount: current.reviewCount + 1 } : current); setIsReviewOpen(false); }} /> : null}</article>
          </section>
        </div>
      </section>
      <aside className="service-profile-support-rail">
        {profile.ownerId && profile.ownerId === viewerId ? <ServiceOwnerActions serviceId={profile.id} providerName={profile.provider} /> : null}
        <ServiceProfileContactCard profile={{ ...profile, streetAddress: publicStreetAddress }} location={location} directionsHref={directionsHref} websiteHref={websiteHref} categoryLabel={labels[profile.category]} isKorean={isKorean} />
        <ServiceCardPreview className="ui-card service-profile-card-preview" content={{ businessName: profile.businessName, serviceName: profile.provider, categoryLabel: labels[profile.category], description: profile.description, location, streetAddress: publicStreetAddress, phone: profile.phone, email: profile.email, website: websiteHref, priceLabel, logo: profile.logo, photo: profile.images[0] ?? heroImage ?? null, isKorean }} />
      </aside>
    </main>
  );
}
