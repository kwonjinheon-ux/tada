"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { PageContainer, PageInner } from "@/components/layout/PageContainer";
import { serviceBadgeLabel, serviceDetailsSummary, services, servicesCategoryLabels, type ServiceBadge, type ServiceCategoryId } from "@/data/services";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ServiceProfile = {
  id: string;
  provider: string;
  category: ServiceCategoryId;
  description: string;
  providerType: "business" | "sole_trader";
  serviceAreas: string[];
  suburbs: string[];
  phone: string;
  email: string | null;
  website: string | null;
  streetAddress: string | null;
  weekdayHours: string | null;
  saturdayHours: string | null;
  sundayHours: string | null;
  foundedYear: number | null;
  rating: number;
  reviewCount: number;
  priceFrom: number | null;
  priceUnit: string | null;
  serviceDetails: Record<string, unknown>;
  logo: string | null;
  images: string[];
  badges: ServiceBadge[];
};

function previewProfile(serviceId: string, isKorean: boolean): ServiceProfile | null {
  const service = services.find((item) => item.id === serviceId);
  if (!service) return null;
  return { id: service.id, provider: service.provider, category: service.category, description: isKorean ? "지역 고객에게 믿을 수 있는 서비스를 제공하는 Tada 서비스 제공자입니다. 필요한 내용을 편하게 문의해 주세요." : "A trusted local Tada provider ready to help with your next job. Get in touch to discuss what you need.", providerType: service.providerType === "businesses" ? "business" : "sole_trader", serviceAreas: ["Hamilton"], suburbs: [], phone: service.phone, email: null, website: null, streetAddress: null, weekdayHours: null, saturdayHours: null, sundayHours: null, foundedYear: null, rating: service.rating, reviewCount: service.reviewCount, priceFrom: null, priceUnit: null, serviceDetails: {}, logo: null, images: [service.image], badges: service.badges };
}

export function ServiceProfileClient({ serviceId }: { serviceId: string }) {
  const { locale } = useLanguage();
  const isKorean = locale === "ko";
  const labels = servicesCategoryLabels(locale);
  const [profile, setProfile] = useState<ServiceProfile | null>(() => previewProfile(serviceId, isKorean));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    void (async () => {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) { if (isCurrent) setIsLoading(false); return; }
      const { data, error } = await supabase.from("service_listings").select("id,category_slug,provider_name,description,provider_type,service_areas,suburbs,phone,email,website,street_address,weekday_hours,saturday_hours,sunday_hours,founded_year,rating,review_count,price_from,price_unit,service_details,service_listing_photos(storage_path,display_order,photo_kind)").eq("id", serviceId).maybeSingle();
      if (error || !data || !isCurrent) { if (isCurrent) setIsLoading(false); return; }
      const photos = [...(data.service_listing_photos ?? [])].sort((left, right) => left.display_order - right.display_order);
      const photoPaths = photos.map((photo) => photo.storage_path);
      const { data: signedPhotos } = photoPaths.length ? await supabase.storage.from("service-listing-images").createSignedUrls(photoPaths, 60 * 60) : { data: [] };
      if (!isCurrent) return;
      const urlsByPath = new Map((signedPhotos ?? []).filter((photo) => photo.path && photo.signedUrl).map((photo) => [photo.path, photo.signedUrl]));
      const logoPath = photos.find((photo) => photo.photo_kind === "logo")?.storage_path;
      const galleryPaths = photos.filter((photo) => photo.photo_kind !== "logo").map((photo) => photo.storage_path);
      setProfile({ id: data.id, provider: data.provider_name, category: data.category_slug as ServiceCategoryId, description: data.description, providerType: data.provider_type, serviceAreas: data.service_areas ?? [], suburbs: data.suburbs ?? [], phone: data.phone, email: data.email, website: data.website, streetAddress: data.street_address, weekdayHours: data.weekday_hours, saturdayHours: data.saturday_hours, sundayHours: data.sunday_hours, foundedYear: data.founded_year, rating: Number(data.rating), reviewCount: data.review_count, priceFrom: data.price_from === null ? null : Number(data.price_from), priceUnit: data.price_unit, serviceDetails: data.service_details && typeof data.service_details === "object" && !Array.isArray(data.service_details) ? data.service_details : {}, logo: logoPath ? urlsByPath.get(logoPath) ?? null : null, images: galleryPaths.map((path) => urlsByPath.get(path)).filter((url): url is string => Boolean(url)), badges: Number(data.rating) >= 4.5 ? ["highlyRated"] : ["new"] });
      setIsLoading(false);
    })();
    return () => { isCurrent = false; };
  }, [serviceId]);

  if (isLoading && !profile) return <main className="service-profile-page"><PageContainer><PageInner><p className="service-profile-loading">{isKorean ? "서비스 정보를 불러오는 중…" : "Loading service profile…"}</p></PageInner></PageContainer></main>;
  if (!profile) return <main className="service-profile-page"><PageContainer><PageInner><section className="service-profile-empty ui-card"><h1>{isKorean ? "서비스를 찾을 수 없습니다." : "Service not found."}</h1><p>{isKorean ? "삭제되었거나 공개되지 않은 서비스입니다." : "This service is no longer available or has not been published."}</p><Link className="ui-button ui-button--primary" href="/services">{isKorean ? "서비스 목록으로" : "Back to services"}</Link></section></PageInner></PageContainer></main>;

  const location = [...profile.suburbs, ...profile.serviceAreas].filter(Boolean).join(", ") || (isKorean ? "뉴질랜드" : "New Zealand");
  const heroImage = profile.images[0];
  const websiteHref = profile.website?.startsWith("http") ? profile.website : profile.website ? `https://${profile.website}` : null;
  const directionsHref = profile.streetAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${profile.streetAddress}, ${location}`)}` : null;
  const detailRows = profile.priceFrom === null || !profile.priceUnit ? [] : serviceDetailsSummary(profile.category, { ...profile.serviceDetails, price_from: String(profile.priceFrom), price_unit: profile.priceUnit }, locale);
  return <main className="service-profile-page"><PageContainer><PageInner className="service-profile-shell"><Link className="service-profile-back" href="/services"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> {isKorean ? "서비스 목록" : "Services"}</Link><section className="service-profile-hero ui-card"><div className="service-profile-media">{heroImage ? <img src={heroImage} alt={`${profile.provider} ${isKorean ? "서비스 사진" : "service"}`} /> : <i className="fa-solid fa-briefcase" aria-hidden="true" />}</div><div className="service-profile-hero-copy"><p>{labels[profile.category]}</p><h1>{profile.logo ? <img className="service-profile-logo" src={profile.logo} alt={`${profile.provider} logo`} /> : null}{profile.provider}</h1><div className="services-listing-badges">{profile.badges.map((badge) => <span className={`service-badge is-${badge}`} key={badge}>{serviceBadgeLabel(badge, locale)}</span>)}</div><div className="service-profile-rating"><i className="fa-solid fa-star" aria-hidden="true" /> <strong>{profile.rating.toFixed(1)}</strong><span>({profile.reviewCount} {isKorean ? "후기" : "reviews"})</span></div><div className="service-profile-actions"><a className="ui-button ui-button--primary" href={`tel:${profile.phone.replace(/\s/g, "")}`}><i className="fa-solid fa-phone" aria-hidden="true" /> {isKorean ? "전화 문의" : "Call now"}</a>{profile.email ? <a className="ui-button ui-button--secondary" href={`mailto:${profile.email}`}><i className="fa-regular fa-envelope" aria-hidden="true" /> {isKorean ? "이메일" : "Email"}</a> : null}</div></div></section><div className="service-profile-layout"><section className="service-profile-content"><article className="service-profile-section ui-card"><p className="service-profile-eyebrow">{isKorean ? "서비스 소개" : "About this service"}</p><h2>{isKorean ? "고객에게 제공하는 도움" : "How this provider can help"}</h2><p>{profile.description}</p></article>{detailRows.length ? <article className="service-profile-section ui-card"><p className="service-profile-eyebrow">{isKorean ? "서비스 및 가격" : "Service details & pricing"}</p><dl className="service-profile-details">{detailRows.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article> : null}{profile.weekdayHours || profile.saturdayHours || profile.sundayHours || profile.foundedYear ? <article className="service-profile-section ui-card"><p className="service-profile-eyebrow">{isKorean ? "업체 정보" : "Business information"}</p><dl className="service-profile-details">{profile.weekdayHours ? <div><dt>{isKorean ? "평일" : "Weekdays"}</dt><dd>{profile.weekdayHours}</dd></div> : null}{profile.saturdayHours ? <div><dt>{isKorean ? "토요일" : "Saturday"}</dt><dd>{profile.saturdayHours}</dd></div> : null}{profile.sundayHours ? <div><dt>{isKorean ? "일요일·공휴일" : "Sunday & public holidays"}</dt><dd>{profile.sundayHours}</dd></div> : null}{profile.foundedYear ? <div><dt>{isKorean ? "설립" : "Established"}</dt><dd>{profile.foundedYear}</dd></div> : null}</dl></article> : null}{profile.images.length ? <article className="service-profile-section ui-card"><p className="service-profile-eyebrow">{isKorean ? "작업 사진" : "Work gallery"}</p><div className="service-profile-gallery">{profile.images.map((image, index) => <img key={image} src={image} alt={`${profile.provider} ${index + 1}`} />)}</div></article> : null}</section><aside className="service-profile-contact ui-card"><h2>{isKorean ? "연락처 및 위치" : "Contact & location"}</h2><p><i className="fa-solid fa-location-dot" aria-hidden="true" /> {location}</p>{profile.streetAddress ? <p><i className="fa-solid fa-location-crosshairs" aria-hidden="true" /> {profile.streetAddress}</p> : null}{directionsHref ? <a className="ui-button ui-button--primary service-profile-directions" href={directionsHref} target="_blank" rel="noreferrer"><i className="fa-solid fa-diamond-turn-right" aria-hidden="true" /> {isKorean ? "길찾기" : "Get directions"}</a> : null}<p><i className="fa-solid fa-briefcase" aria-hidden="true" /> {profile.providerType === "business" ? (isKorean ? "지역 업체" : "Local business") : (isKorean ? "개인 사업자" : "Sole trader")}</p><p><i className="fa-solid fa-phone" aria-hidden="true" /> <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>{profile.phone}</a></p>{profile.email ? <p><i className="fa-regular fa-envelope" aria-hidden="true" /> <a href={`mailto:${profile.email}`}>{profile.email}</a></p> : null}{websiteHref ? <p><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> <a href={websiteHref} target="_blank" rel="noreferrer">{isKorean ? "웹사이트 방문" : "Visit website"}</a></p> : null}</aside></div></PageInner></PageContainer></main>;
}
