"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { servicesCategoryLabels, type ServiceCategoryId } from "@/data/services";
import { useLanguage } from "@/components/LanguageProvider";
import { BackToMyPage } from "@/components/layout/NavigationHistory";

export function AccountLocaleText({ en, ko }: { en: string; ko: string }) {
  const { locale } = useLanguage();
  return <>{locale === "ko" ? ko : en}</>;
}

type AccountPageIntroProps = {
  title: ReactNode;
  description: ReactNode;
  detail?: string;
  backToMyPage?: boolean;
};

/** The small, consistent introduction shared by My Page's destination screens. */
export function AccountPageIntro({ title, description, detail, backToMyPage = false }: AccountPageIntroProps) {
  return <header className={`account-page-intro${backToMyPage ? " has-back" : ""}`}>
    <div><div className="account-page-intro-title">{backToMyPage ? <BackToMyPage /> : null}<h1>{title}</h1></div><p>{description}</p>{detail ? <span className="account-page-intro-detail">{detail}</span> : null}</div>
  </header>;
}

type DashboardAdBannerProps = { kind: "notifications" | "wishlist" | "keywords" | "listings" | "reservations" };

/** Clearly labelled house promotion, kept away from account actions and private content. */
export function DashboardAdBanner({ kind }: DashboardAdBannerProps) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const content = {
    notifications: { title: ko ? "우리 동네에서 필요한 도움을 찾아보세요" : "Find a helping hand nearby", description: ko ? "가까운 곳의 서비스를 타다에서 만나보세요." : "Explore useful local services on Tada.", action: ko ? "서비스 둘러보기" : "Explore services", href: "/services" },
    wishlist: { title: ko ? "다음 마음에 드는 것을 찾아보세요" : "Find your next local favourite", description: ko ? "우리 동네에 새로 올라온 상품을 둘러보세요." : "See what's new in your neighbourhood.", action: ko ? "마켓 둘러보기" : "Explore Market", href: "/market" },
    keywords: { title: ko ? "찾는 상품이 아직 없나요?" : "Still looking for something?", description: ko ? "키워드를 저장하고 우리 동네 마켓도 둘러보세요." : "Save a keyword and browse your local market.", action: ko ? "마켓 둘러보기" : "Explore Market", href: "/market" },
    listings: { title: ko ? "내 서비스를 이웃에게 소개해 보세요" : "Share your service with neighbours", description: ko ? "도움이 필요한 이웃이 서비스를 발견할 수 있어요." : "Help neighbours discover what you can offer.", action: ko ? "서비스 등록" : "List a service", href: "/services/create" },
    reservations: { title: ko ? "다음 동네 거래를 찾아보세요" : "Find your next local deal", description: ko ? "가까운 이웃이 새로 올린 상품을 둘러보세요." : "See what neighbours have listed nearby.", action: ko ? "마켓 둘러보기" : "Explore Market", href: "/market" },
  }[kind];
  const image = kind === "keywords" || kind === "reservations" ? "/images/home/journey-market.png" : kind === "listings" ? "/images/home/journey-services.png" : "/images/brand/tada-wordmark.png";
  const illustrated = kind === "keywords" || kind === "listings" || kind === "reservations";

  return <aside className="ui-panel account-ad-banner" aria-label={ko ? "광고" : "Advertisement"}>
    <div className="account-ad-copy"><span>{ko ? "광고 · 타다 추천" : "Ad · From Tada"}</span><strong>{content.title}</strong><p>{content.description}</p><Link className="ui-button ui-button--secondary ui-button--sm" href={content.href}>{content.action}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>
    <img src={image} alt="" width={illustrated ? 1536 : 1965} height={illustrated ? 1024 : 800} loading="lazy" />
  </aside>;
}

/** The optional account rail keeps follow-up actions separate from the owned listings. */
export function AccountWorkspaceAside({ kind = "listings" }: { kind?: "listings" | "reservations" }) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const help = <section className="ui-panel account-rail-card account-workspace-help">
    <span className="account-rail-icon"><i className="ms ms-chat" aria-hidden="true" /></span>
    <div><h2>{kind === "reservations" ? ko ? "약속은 메시지에서 조율하세요" : "Plan the handover in messages" : ko ? "이웃과의 대화도 놓치지 마세요" : "Keep your conversations moving"}</h2><p>{kind === "reservations" ? ko ? "수령 시간이나 장소를 확인하고 이웃과 대화하세요." : "Confirm pickup time and place with your neighbour." : ko ? "상품과 서비스에 관한 메시지를 한곳에서 확인하세요." : "Find messages about your items and services in one place."}</p><Link href="/market/dashboard/messages">{ko ? "메시지 확인" : "View messages"}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>
  </section>;
  return <aside className="account-side-rail account-workspace-aside" aria-label={kind === "reservations" ? ko ? "예약 도움말" : "Reservation help" : ko ? "등록 관리 안내" : "Listing help"}>
    {kind === "reservations" ? help : <DashboardAdBanner kind="listings" />}
    {kind === "reservations" ? <DashboardAdBanner kind="reservations" /> : help}
  </aside>;
}

export type SavedServiceSummary = {
  id: string;
  businessName: string;
  serviceName: string;
  categorySlug: string;
  location: string;
  rating: number | null;
  reviewCount: number | null;
  logoUrl: string | null;
};

/** A compact, in-account directory entry for a provider saved to the service wishlist. */
export function SavedServiceCard({ service }: { service: SavedServiceSummary }) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const categoryLabel = servicesCategoryLabels(locale)[service.categorySlug as ServiceCategoryId] ?? service.categorySlug;
  const serviceLabel = service.serviceName === service.businessName ? categoryLabel : service.serviceName;
  return <Link className="ui-panel my-page-saved-service is-services" href={`/services/${service.id}`} aria-label={ko ? `${service.businessName} 서비스 상세 보기` : `View ${service.businessName} service details`}>
    <span className="services-listing-logo my-page-saved-service-logo">{service.logoUrl ? <img src={service.logoUrl} alt="" /> : <i className="ms ms-build" aria-hidden="true" />}</span>
    <span className="my-page-saved-service-info">
      <strong>{service.businessName}</strong>
      <span>{serviceLabel}</span>
      <small>{service.location ? <><i className="ms ms-location-on" aria-hidden="true" />{service.location}</> : ko ? "지역 정보 없음" : "Location not listed"}</small>
    </span>
    <span className="my-page-saved-service-foot">
      {service.rating !== null && service.reviewCount !== null && service.reviewCount > 0 ? <span><i className="ms ms-star" aria-hidden="true" />{service.rating.toFixed(1)} <small>({service.reviewCount})</small></span> : <span>{ko ? "아직 후기 없음" : "No reviews yet"}</span>}
      <span>{ko ? "상세 보기" : "View details"}<i className="ms ms-arrow-forward" aria-hidden="true" /></span>
    </span>
  </Link>;
}
