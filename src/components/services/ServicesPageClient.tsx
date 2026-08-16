"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";

type ServiceCategoryId = "cleaning" | "moving" | "handyman" | "gardening" | "beauty" | "tutoring" | "petCare" | "auto";
type ServiceId = "sparkle-clean" | "fixit-furniture" | "math-mentors" | "moving-help" | "garden-lawn" | "beauty-services" | "happy-paws" | "auto-repair";
type QuickFilterId = "availableToday" | "verified" | "topRated" | "lowPrice" | "nearMe";
type TrustPointId = "verified" | "payments" | "support";

type ServiceListing = {
  id: ServiceId;
  category: ServiceCategoryId;
  badgeClass: "success" | "warning";
  provider: string;
  rating: string;
  image: string;
};

const categories: Array<{ id: ServiceCategoryId; icon: string }> = [
  { id: "cleaning", icon: "fa-spray-can-sparkles" },
  { id: "moving", icon: "fa-truck" },
  { id: "handyman", icon: "fa-screwdriver-wrench" },
  { id: "gardening", icon: "fa-seedling" },
  { id: "beauty", icon: "fa-wand-magic-sparkles" },
  { id: "tutoring", icon: "fa-graduation-cap" },
  { id: "petCare", icon: "fa-paw" },
  { id: "auto", icon: "fa-car" },
];

const services: ServiceListing[] = [
  { id: "sparkle-clean", category: "cleaning", badgeClass: "success", provider: "Sparkle Clean", rating: "4.9 (126)", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=720&q=85" },
  { id: "fixit-furniture", category: "handyman", badgeClass: "success", provider: "FixIt Hamilton", rating: "4.9 (98)", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=720&q=85" },
  { id: "math-mentors", category: "tutoring", badgeClass: "warning", provider: "Math Mentors", rating: "4.8 (64)", image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=720&q=85" },
  { id: "moving-help", category: "moving", badgeClass: "success", provider: "Move It", rating: "4.8 (46)", image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=720&q=85" },
  { id: "garden-lawn", category: "gardening", badgeClass: "success", provider: "Green Thumb", rating: "4.7 (41)", image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=720&q=85" },
  { id: "beauty-services", category: "beauty", badgeClass: "warning", provider: "Glow On The Go", rating: "4.9 (72)", image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=720&q=85" },
  { id: "happy-paws", category: "petCare", badgeClass: "success", provider: "Happy Paws", rating: "4.8 (53)", image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=720&q=85" },
  { id: "auto-repair", category: "auto", badgeClass: "success", provider: "Pro Auto Hamilton", rating: "4.9 (112)", image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=720&q=85" },
];

const quickFilters: Array<{ id: QuickFilterId; icon: string }> = [
  { id: "availableToday", icon: "fa-calendar-day" },
  { id: "verified", icon: "fa-circle-check" },
  { id: "topRated", icon: "fa-star" },
  { id: "lowPrice", icon: "fa-tag" },
  { id: "nearMe", icon: "fa-location-crosshairs" },
];

const trustPoints: Array<{ id: TrustPointId; icon: string }> = [
  { id: "verified", icon: "fa-shield-halved" },
  { id: "payments", icon: "fa-lock" },
  { id: "support", icon: "fa-headset" },
];

const serviceCopy = {
  en: {
    preview: "Services preview",
    heroTitle: "Trusted local help, close to home.",
    heroDescription: "Find reliable people for the everyday jobs that make local life easier. Booking and secure payment are coming soon to Tada.",
    searchLabel: "What service do you need?",
    searchPlaceholder: "What service do you need?",
    locationLabel: "Service location",
    location: "Hamilton, NZ",
    searchAction: "Search services",
    quickFilterLabel: "Quick service filters",
    browseEyebrow: "Browse by category",
    categoryTitle: "What can we help with?",
    showAll: "Show all",
    filters: "Filters",
    clearAll: "Clear all",
    serviceType: "Service type",
    allCategories: "All categories",
    priceRange: "Price range",
    anyPrice: "Any price",
    underFifty: "Under $50 / hr",
    fiftyToHundred: "$50–$100 / hr",
    availability: "Availability",
    anytime: "Anytime",
    thisWeek: "This week",
    rating: "Rating",
    anyRating: "Any rating",
    fourFiveAbove: "4.5 and above",
    fourAbove: "4.0 and above",
    verifiedOnly: "Verified only",
    applyFilters: "Apply filters",
    popularServices: "Popular services near Hamilton",
    localHelp: "Local help, chosen for you",
    categoryNearby: (category: string) => `${category} near Hamilton`,
    exploreCategory: (category: string) => `Explore ${category.toLowerCase()} help`,
    serviceCount: (count: number) => `${count} services previewed`,
    saveService: (service: string) => `Save ${service}`,
    whyTadaServices: "Why use Tada Services",
    providerLabel: "For providers",
    providerTitle: "Grow your local service.",
    providerDescription: "Meet more local customers with a trusted Tada profile.",
    providerAction: "For service providers",
    trustAction: "How Tada Services works",
    requestEyebrow: "Can't find what you need?",
    requestTitle: "Tell local providers what you're looking for.",
    requestDescription: "Service requests will make it easy to get offers from the right people.",
    requestAction: "Request a service",
    searchNotice: (term: string) => term ? `“${term}” service search will be available when Services launches.` : "Service search will be available when Services launches.",
    saveNotice: (service: string) => `${service} can be saved when Services launches.`,
    providerNotice: "Provider profiles will be available when Services launches.",
    trustNotice: "More about Tada Services is coming soon.",
    requestNotice: "Service requests will be available when Services launches.",
    categories: { cleaning: "Cleaning", moving: "Moving", handyman: "Handyman", gardening: "Gardening", beauty: "Beauty", tutoring: "Tutoring", petCare: "Pet care", auto: "Auto" },
    quickFilters: { availableToday: "Available today", verified: "Verified", topRated: "Top rated", lowPrice: "Low price", nearMe: "Near me" },
    trust: {
      verified: { title: "Verified & reviewed", description: "Every provider goes through our verification process." },
      payments: { title: "Safe payments", description: "Pay safely through Tada when booking opens." },
      support: { title: "Local support", description: "Our team is here to help before and after a service." },
    },
    listings: {
      "sparkle-clean": { badge: "Available today", title: "Home cleaning", charge: "Tada Charge 88%", location: "Hamilton Central", price: "From $40 / hr", imageAlt: "A cleaner making a bed in a bright home" },
      "fixit-furniture": { badge: "Verified", title: "Furniture assembly", charge: "Tada Charge 90%", location: "Frankton", price: "From $60 / hr", imageAlt: "A craftsman preparing furniture in a room" },
      "math-mentors": { badge: "Top rated", title: "Math tutoring", charge: "Tada Charge 91%", location: "Hamilton East", price: "From $35 / hr", imageAlt: "A tutor helping a student with schoolwork" },
      "moving-help": { badge: "Available today", title: "Moving help", charge: "Tada Charge 89%", location: "Hamilton North", price: "From $120 / hr", imageAlt: "A mover carrying a cardboard box" },
      "garden-lawn": { badge: "Verified", title: "Garden & lawn care", charge: "Tada Charge 83%", location: "Rototuna", price: "From $45 / hr", imageAlt: "A gardener working among green plants" },
      "beauty-services": { badge: "Top rated", title: "Mobile beauty services", charge: "Tada Charge 92%", location: "Hamilton Central", price: "From $60 / hr", imageAlt: "A beauty professional applying makeup" },
      "happy-paws": { badge: "Verified", title: "Pet sitting", charge: "Tada Charge 87%", location: "Hamilton East", price: "From $30 / hr", imageAlt: "A dog sitting with its owner outdoors" },
      "auto-repair": { badge: "Verified", title: "Auto repair & service", charge: "Tada Charge 94%", location: "Frankton", price: "From $80 / hr", imageAlt: "A mechanic working under a car bonnet" },
    },
  },
  ko: {
    preview: "서비스 미리보기",
    heroTitle: "가까운 곳에서 찾는 믿을 수 있는 도움.",
    heroDescription: "일상을 더 편하게 만드는 지역 전문가를 찾아보세요. 예약과 안전 결제 기능은 곧 Tada에서 만나볼 수 있습니다.",
    searchLabel: "어떤 도움이 필요하신가요?",
    searchPlaceholder: "필요한 서비스를 검색하세요",
    locationLabel: "서비스 지역",
    location: "해밀턴, 뉴질랜드",
    searchAction: "서비스 검색",
    quickFilterLabel: "빠른 서비스 필터",
    browseEyebrow: "카테고리로 찾아보기",
    categoryTitle: "무엇을 도와드릴까요?",
    showAll: "전체 보기",
    filters: "필터",
    clearAll: "초기화",
    serviceType: "서비스 종류",
    allCategories: "전체 카테고리",
    priceRange: "가격대",
    anyPrice: "가격 전체",
    underFifty: "시간당 $50 미만",
    fiftyToHundred: "시간당 $50–$100",
    availability: "이용 가능 시간",
    anytime: "언제든지",
    thisWeek: "이번 주",
    rating: "평점",
    anyRating: "평점 전체",
    fourFiveAbove: "4.5점 이상",
    fourAbove: "4.0점 이상",
    verifiedOnly: "인증된 제공자만",
    applyFilters: "필터 적용",
    popularServices: "해밀턴에서 인기 있는 서비스",
    localHelp: "내 주변에서 찾은 도움",
    categoryNearby: (category: string) => `해밀턴 주변 ${category}`,
    exploreCategory: (category: string) => `${category} 서비스 둘러보기`,
    serviceCount: (count: number) => `${count}개 서비스 미리보기`,
    saveService: (service: string) => `${service} 찜하기`,
    whyTadaServices: "Tada 서비스를 이용하는 이유",
    providerLabel: "서비스 제공자용",
    providerTitle: "내 지역 서비스 고객을 만나보세요.",
    providerDescription: "신뢰할 수 있는 Tada 프로필로 더 많은 지역 고객에게 다가갈 수 있습니다.",
    providerAction: "서비스 제공자 안내",
    trustAction: "Tada 서비스 이용 방법",
    requestEyebrow: "원하는 서비스를 찾지 못하셨나요?",
    requestTitle: "필요한 일을 지역 전문가에게 알려주세요.",
    requestDescription: "서비스 요청을 올리면 알맞은 전문가의 제안을 쉽게 받아볼 수 있습니다.",
    requestAction: "서비스 요청하기",
    searchNotice: (term: string) => term ? `“${term}” 검색은 서비스 출시 후 이용할 수 있습니다.` : "서비스 검색은 출시 후 이용할 수 있습니다.",
    saveNotice: (service: string) => `${service} 찜하기는 서비스 출시 후 이용할 수 있습니다.`,
    providerNotice: "서비스 제공자 프로필은 서비스 출시 후 이용할 수 있습니다.",
    trustNotice: "Tada 서비스에 대한 자세한 안내를 곧 제공할 예정입니다.",
    requestNotice: "서비스 요청 기능은 서비스 출시 후 이용할 수 있습니다.",
    categories: { cleaning: "청소", moving: "이사", handyman: "집수리", gardening: "정원 관리", beauty: "뷰티", tutoring: "과외", petCare: "펫 케어", auto: "자동차" },
    quickFilters: { availableToday: "오늘 가능", verified: "인증됨", topRated: "높은 평점", lowPrice: "낮은 가격", nearMe: "내 주변" },
    trust: {
      verified: { title: "인증 및 후기 확인", description: "모든 제공자는 Tada의 확인 절차를 거칩니다." },
      payments: { title: "안전한 결제", description: "예약 기능이 열리면 Tada에서 안전하게 결제할 수 있습니다." },
      support: { title: "지역 고객 지원", description: "서비스 전후로 Tada 팀이 도와드립니다." },
    },
    listings: {
      "sparkle-clean": { badge: "오늘 가능", title: "집 청소", charge: "Tada Charge 88%", location: "해밀턴 센트럴", price: "시간당 $40부터", imageAlt: "밝은 집에서 침대를 정리하는 청소 전문가" },
      "fixit-furniture": { badge: "인증됨", title: "가구 조립", charge: "Tada Charge 90%", location: "프랭크턴", price: "시간당 $60부터", imageAlt: "실내에서 가구를 준비하는 전문가" },
      "math-mentors": { badge: "높은 평점", title: "수학 과외", charge: "Tada Charge 91%", location: "해밀턴 이스트", price: "시간당 $35부터", imageAlt: "학생의 공부를 돕는 과외 선생님" },
      "moving-help": { badge: "오늘 가능", title: "이사 도움", charge: "Tada Charge 89%", location: "해밀턴 노스", price: "시간당 $120부터", imageAlt: "상자를 들고 있는 이사 전문가" },
      "garden-lawn": { badge: "인증됨", title: "정원 및 잔디 관리", charge: "Tada Charge 83%", location: "로토투나", price: "시간당 $45부터", imageAlt: "초록 식물 사이에서 일하는 정원 관리사" },
      "beauty-services": { badge: "높은 평점", title: "방문 뷰티 서비스", charge: "Tada Charge 92%", location: "해밀턴 센트럴", price: "시간당 $60부터", imageAlt: "메이크업을 해주는 뷰티 전문가" },
      "happy-paws": { badge: "인증됨", title: "펫시팅", charge: "Tada Charge 87%", location: "해밀턴 이스트", price: "시간당 $30부터", imageAlt: "반려견과 함께 있는 펫시터" },
      "auto-repair": { badge: "인증됨", title: "자동차 정비 및 수리", charge: "Tada Charge 94%", location: "프랭크턴", price: "시간당 $80부터", imageAlt: "자동차 보닛 아래에서 작업하는 정비사" },
    },
  },
} as const;

export function ServicesPageClient() {
  const { locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = locale === "ko" ? serviceCopy.ko : serviceCopy.en;
  const [activeCategory, setActiveCategory] = useState<ServiceCategoryId | null>(null);
  const [activeFilter, setActiveFilter] = useState<QuickFilterId | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const searchQuery = searchParams.get("q")?.trim().slice(0, 60) ?? "";

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const visibleServices = useMemo(() => {
    const normalizedQuery = searchQuery.toLocaleLowerCase();
    return services.filter((service) => {
      if (activeCategory && service.category !== activeCategory) return false;
      if (!normalizedQuery) return true;
      const listing = text.listings[service.id];
      return [listing.title, service.provider, text.categories[service.category]].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [activeCategory, searchQuery, text]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) params.set("q", query.trim()); else params.delete("q");
    router.push(`/services${params.size ? `?${params.toString()}` : ""}`);
    setNotice("");
  };

  const chooseCategory = (category: ServiceCategoryId) => {
    setActiveCategory((current) => current === category ? null : category);
    setNotice("");
  };

  return (
    <main className="services-page">
      <PageContainer className="services-page-content">
        <section className="services-hero" aria-labelledby="services-title">
          <div className="services-hero-copy">
            <span className="services-preview-label ui-pill"><i className="fa-solid fa-sparkles" aria-hidden="true" /> {text.preview}</span>
            <h1 id="services-title">{text.heroTitle}</h1>
            <p>{text.heroDescription}</p>
          </div>

          <div className="services-search-wrap">
            <form className="services-search ui-card" role="search" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="services-search-input">{text.searchLabel}</label>
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input id="services-search-input" value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder={text.searchPlaceholder} />
              <label className="sr-only" htmlFor="services-location">{text.locationLabel}</label>
              <span className="services-location"><i className="fa-solid fa-location-dot" aria-hidden="true" /><select id="services-location" key={text.location} defaultValue={text.location}><option>{text.location}</option></select></span>
              <Button className="services-search-submit" type="submit" pill>{text.searchAction}</Button>
            </form>
            <div className="services-quick-filters" aria-label={text.quickFilterLabel}>
              {quickFilters.map((filter) => <button className={activeFilter === filter.id ? "is-active" : ""} type="button" key={filter.id} aria-pressed={activeFilter === filter.id} onClick={() => setActiveFilter((current) => current === filter.id ? null : filter.id)}><i className={`fa-solid ${filter.icon}`} aria-hidden="true" />{text.quickFilters[filter.id]}</button>)}
            </div>
            {notice ? <p className="services-notice" role="status">{notice}</p> : null}
          </div>
        </section>

        <section className="services-category-section" aria-labelledby="services-category-title">
          <div className="services-section-heading">
            <div><p>{text.browseEyebrow}</p><h2 id="services-category-title">{text.categoryTitle}</h2></div>
            {activeCategory ? <button className="services-clear-button" type="button" onClick={() => setActiveCategory(null)}>{text.showAll}</button> : null}
          </div>
          <div className="services-category-grid">
            {categories.map((category) => <button className={activeCategory === category.id ? "services-category is-active" : "services-category"} type="button" key={category.id} aria-pressed={activeCategory === category.id} onClick={() => chooseCategory(category.id)}><span><i className={`fa-solid ${category.icon}`} aria-hidden="true" /></span><strong>{text.categories[category.id]}</strong></button>)}
          </div>
        </section>

        <div className="services-content-layout">
          <aside className="services-filter-panel ui-panel" aria-label={text.filters}>
            <div className="services-filter-heading"><h2>{text.filters}</h2><button type="button" onClick={() => { setActiveCategory(null); setActiveFilter(null); }}>{text.clearAll}</button></div>
            <label className="ui-field"><span>{text.serviceType}</span><select defaultValue={text.allCategories}><option>{text.allCategories}</option>{categories.map((category) => <option key={category.id}>{text.categories[category.id]}</option>)}</select></label>
            <label className="ui-field"><span>{text.priceRange}</span><select defaultValue={text.anyPrice}><option>{text.anyPrice}</option><option>{text.underFifty}</option><option>{text.fiftyToHundred}</option></select></label>
            <label className="ui-field"><span>{text.availability}</span><select defaultValue={text.anytime}><option>{text.anytime}</option><option>{text.quickFilters.availableToday}</option><option>{text.thisWeek}</option></select></label>
            <label className="ui-field"><span>{text.rating}</span><select defaultValue={text.anyRating}><option>{text.anyRating}</option><option>{text.fourFiveAbove}</option><option>{text.fourAbove}</option></select></label>
            <label className="services-checkbox"><input type="checkbox" /> {text.verifiedOnly}</label>
            <label className="services-checkbox"><input type="checkbox" /> {text.quickFilters.availableToday}</label>
            <Button className="services-filter-apply" variant="secondary" block>{text.applyFilters}</Button>
          </aside>

          <section className="services-results" aria-labelledby="services-results-title">
            <div className="services-results-heading">
              <div><p>{activeCategory ? text.categoryNearby(text.categories[activeCategory]) : text.popularServices}</p><h2 id="services-results-title">{activeCategory ? text.exploreCategory(text.categories[activeCategory]) : text.localHelp}</h2></div>
              <span>{text.serviceCount(visibleServices.length)}</span>
            </div>
            <div className="services-card-grid">
              {visibleServices.map((service) => {
                const listing = text.listings[service.id];
                return <article className="services-listing ui-card" key={service.id}>
                  <div className="services-listing-image"><Image src={service.image} alt={listing.imageAlt} fill sizes="(max-width: 767px) 84vw, (max-width: 1023px) 42vw, (min-width: 1280px) 15vw, 24vw" /><button type="button" aria-label={text.saveService(listing.title)} onClick={() => setNotice(text.saveNotice(listing.title))}><i className="fa-regular fa-heart" aria-hidden="true" /></button><span className={`ui-pill ${service.badgeClass === "success" ? "ui-pill--success" : "ui-pill--warning"}`}>{listing.badge}</span></div>
                  <div className="services-listing-copy"><h3>{listing.title}</h3><p>{service.provider}</p><div className="services-listing-meta"><span><i className="fa-solid fa-star" aria-hidden="true" /> {service.rating}</span><span>{listing.charge}</span></div><span className="services-listing-location"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {listing.location}</span><strong>{listing.price}</strong></div>
                </article>;
              })}
            </div>
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
        </div>

        <section className="services-request-cta ui-card" aria-labelledby="services-request-title">
          <span className="services-request-icon"><i className="fa-solid fa-clipboard-list" aria-hidden="true" /></span>
          <div><p>{text.requestEyebrow}</p><h2 id="services-request-title">{text.requestTitle}</h2><span>{text.requestDescription}</span></div>
          <Button pill onClick={() => setNotice(text.requestNotice)}><i className="fa-solid fa-plus" aria-hidden="true" /> {text.requestAction}</Button>
        </section>
      </PageContainer>
    </main>
  );
}
