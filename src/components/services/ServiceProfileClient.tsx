"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { PageContainer, PageInner } from "@/components/layout/PageContainer";
import { serviceBadgeLabel, services, servicesCategoryLabels, type ServiceBadge, type ServiceCategoryId } from "@/data/services";
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
  rating: number;
  reviewCount: number;
  images: string[];
  badges: ServiceBadge[];
};

function previewProfile(serviceId: string, isKorean: boolean): ServiceProfile | null {
  const service = services.find((item) => item.id === serviceId);
  if (!service) return null;
  return { id: service.id, provider: service.provider, category: service.category, description: isKorean ? "지역 고객에게 믿을 수 있는 서비스를 제공하는 Tada 서비스 제공자입니다. 필요한 내용을 편하게 문의해 주세요." : "A trusted local Tada provider ready to help with your next job. Get in touch to discuss what you need.", providerType: service.providerType === "businesses" ? "business" : "sole_trader", serviceAreas: ["Hamilton"], suburbs: [], phone: service.phone, email: null, website: null, rating: service.rating, reviewCount: service.reviewCount, images: [service.image], badges: service.badges };
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
      const { data, error } = await supabase.from("service_listings").select("id,category_slug,provider_name,description,provider_type,service_areas,suburbs,phone,email,website,rating,review_count,service_listing_photos(storage_path,display_order)").eq("id", serviceId).maybeSingle();
      if (error || !data || !isCurrent) { if (isCurrent) setIsLoading(false); return; }
      const photos = [...(data.service_listing_photos ?? [])].sort((left, right) => left.display_order - right.display_order);
      const photoPaths = photos.map((photo) => photo.storage_path);
      const { data: signedPhotos } = photoPaths.length ? await supabase.storage.from("service-listing-images").createSignedUrls(photoPaths, 60 * 60) : { data: [] };
      if (!isCurrent) return;
      const urlsByPath = new Map((signedPhotos ?? []).filter((photo) => photo.path && photo.signedUrl).map((photo) => [photo.path, photo.signedUrl]));
      setProfile({ id: data.id, provider: data.provider_name, category: data.category_slug as ServiceCategoryId, description: data.description, providerType: data.provider_type, serviceAreas: data.service_areas ?? [], suburbs: data.suburbs ?? [], phone: data.phone, email: data.email, website: data.website, rating: Number(data.rating), reviewCount: data.review_count, images: photoPaths.map((path) => urlsByPath.get(path)).filter((url): url is string => Boolean(url)), badges: Number(data.rating) >= 4.5 ? ["highlyRated"] : ["new"] });
      setIsLoading(false);
    })();
    return () => { isCurrent = false; };
  }, [serviceId]);

  if (isLoading && !profile) return <main className="service-profile-page"><PageContainer><PageInner><p className="service-profile-loading">{isKorean ? "서비스 정보를 불러오는 중…" : "Loading service profile…"}</p></PageInner></PageContainer></main>;
  if (!profile) return <main className="service-profile-page"><PageContainer><PageInner><section className="service-profile-empty ui-card"><h1>{isKorean ? "서비스를 찾을 수 없습니다." : "Service not found."}</h1><p>{isKorean ? "삭제되었거나 공개되지 않은 서비스입니다." : "This service is no longer available or has not been published."}</p><Link className="ui-button ui-button--primary" href="/services">{isKorean ? "서비스 목록으로" : "Back to services"}</Link></section></PageInner></PageContainer></main>;

  const location = [...profile.suburbs, ...profile.serviceAreas].filter(Boolean).join(", ") || (isKorean ? "뉴질랜드" : "New Zealand");
  const heroImage = profile.images[0];
  const websiteHref = profile.website?.startsWith("http") ? profile.website : profile.website ? `https://${profile.website}` : null;
  return <main className="service-profile-page"><PageContainer><PageInner className="service-profile-shell"><Link className="service-profile-back" href="/services"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> {isKorean ? "서비스 목록" : "Services"}</Link><section className="service-profile-hero ui-card"><div className="service-profile-media">{heroImage ? <img src={heroImage} alt={`${profile.provider} ${isKorean ? "서비스 사진" : "service"}`} /> : <i className="fa-solid fa-briefcase" aria-hidden="true" />}</div><div className="service-profile-hero-copy"><p>{labels[profile.category]}</p><h1>{profile.provider}</h1><div className="services-listing-badges">{profile.badges.map((badge) => <span className={`service-badge is-${badge}`} key={badge}>{serviceBadgeLabel(badge, locale)}</span>)}</div><div className="service-profile-rating"><i className="fa-solid fa-star" aria-hidden="true" /> <strong>{profile.rating.toFixed(1)}</strong><span>({profile.reviewCount} {isKorean ? "후기" : "reviews"})</span></div><div className="service-profile-actions"><a className="ui-button ui-button--primary" href={`tel:${profile.phone.replace(/\s/g, "")}`}><i className="fa-solid fa-phone" aria-hidden="true" /> {isKorean ? "전화 문의" : "Call now"}</a>{profile.email ? <a className="ui-button ui-button--secondary" href={`mailto:${profile.email}`}><i className="fa-regular fa-envelope" aria-hidden="true" /> {isKorean ? "이메일" : "Email"}</a> : null}</div></div></section><div className="service-profile-layout"><section className="service-profile-content"><article className="service-profile-section ui-card"><p className="service-profile-eyebrow">{isKorean ? "서비스 소개" : "About this service"}</p><h2>{isKorean ? "고객에게 제공하는 도움" : "How this provider can help"}</h2><p>{profile.description}</p></article>{profile.images.length > 1 ? <article className="service-profile-section ui-card"><p className="service-profile-eyebrow">{isKorean ? "작업 사진" : "Work gallery"}</p><div className="service-profile-gallery">{profile.images.slice(1).map((image, index) => <img key={image} src={image} alt={`${profile.provider} ${index + 2}`} />)}</div></article> : null}</section><aside className="service-profile-contact ui-card"><h2>{isKorean ? "연락 및 활동 지역" : "Contact & service area"}</h2><p><i className="fa-solid fa-location-dot" aria-hidden="true" /> {location}</p><p><i className="fa-solid fa-briefcase" aria-hidden="true" /> {profile.providerType === "business" ? (isKorean ? "지역 업체" : "Local business") : (isKorean ? "개인 사업자" : "Sole trader")}</p><p><i className="fa-solid fa-phone" aria-hidden="true" /> <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>{profile.phone}</a></p>{profile.email ? <p><i className="fa-regular fa-envelope" aria-hidden="true" /> <a href={`mailto:${profile.email}`}>{profile.email}</a></p> : null}{websiteHref ? <p><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> <a href={websiteHref} target="_blank" rel="noreferrer">{isKorean ? "웹사이트 방문" : "Visit website"}</a></p> : null}</aside></div></PageInner></PageContainer></main>;
}
