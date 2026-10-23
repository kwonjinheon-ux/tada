"use client";

import Link from "next/link";
import { servicesCategoryLabels, type ServiceCategoryId } from "@/data/services";
import { useLanguage } from "@/components/LanguageProvider";

type AccountWorkspaceKind = "listings" | "reservations";

export function AccountLocaleText({ en, ko }: { en: string; ko: string }) {
  const { locale } = useLanguage();
  return <>{locale === "ko" ? ko : en}</>;
}

/** Shared destination header for account tasks, with one clear next action. */
export function AccountWorkspaceHeader({ kind, count, primaryHref, searching = false }: { kind: AccountWorkspaceKind; count: number; primaryHref: string; searching?: boolean }) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const copy = kind === "listings"
    ? { icon: "ms-list-alt", title: ko ? "내 상품·서비스" : "My items & services", description: ko ? "등록한 상품과 서비스를 확인하고, 필요한 내용을 바로 관리하세요." : "Keep your items and services up to date in one place.", detail: searching ? ko ? `검색 결과 ${count}개` : `${count} search results` : ko ? `등록한 항목 ${count}개` : `${count} listings`, action: ko ? "새로 등록하기" : "Create a listing" }
    : { icon: "ms-event-available", title: ko ? "예약 및 수령" : "Reservations & pickups", description: ko ? "구매와 판매 약속을 확인하고 다음 단계를 놓치지 마세요." : "Stay on top of purchases, sales and handovers.", detail: ko ? `예약 ${count}건` : `${count} reservations`, action: ko ? "동네 상품 둘러보기" : "Explore Market" };
  return <div className="account-workspace-header">
    <AccountPageIntro icon={copy.icon} title={copy.title} description={copy.description} detail={copy.detail} />
    <Link className="ui-button ui-button--primary" href={primaryHref}><i className={`ms ${kind === "listings" ? "ms-add" : "ms-search"}`} aria-hidden="true" />{copy.action}</Link>
  </div>;
}

export function AccountWorkspaceSummary({ items }: { items: { icon: string; label: string; labelKo: string; value: number; tone?: "market" | "services" }[] }) {
  const { locale } = useLanguage();
  return <div className="account-workspace-summary" aria-label={locale === "ko" ? "현황" : "Overview"}>{items.map((item) => <div className={`ui-panel ${item.tone ? `is-${item.tone}` : ""}`} key={item.label}>
    <i className={`ms ${item.icon}`} aria-hidden="true" /><span>{locale === "ko" ? item.labelKo : item.label}</span><strong>{item.value}</strong>
  </div>)}</div>;
}

type AccountPageIntroProps = {
  icon: string;
  title: string;
  description: string;
  detail?: string;
};

/** The small, consistent introduction shared by My Page's destination screens. */
export function AccountPageIntro({ icon, title, description, detail }: AccountPageIntroProps) {
  return <header className="account-page-intro">
    <span className="account-page-intro-icon"><i className={`ms ${icon}`} aria-hidden="true" /></span>
    <div><h1>{title}</h1><p>{description}</p>{detail ? <span className="account-page-intro-detail">{detail}</span> : null}</div>
  </header>;
}

type DashboardAdBannerProps = { kind: "notifications" | "wishlist" | "keywords" };

/** Clearly labelled house promotion, kept away from account actions and private content. */
export function DashboardAdBanner({ kind }: DashboardAdBannerProps) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const content = {
    notifications: { title: ko ? "우리 동네에서 필요한 도움을 찾아보세요" : "Find a helping hand nearby", description: ko ? "가까운 곳의 서비스를 타다에서 만나보세요." : "Explore useful local services on Tada.", action: ko ? "서비스 둘러보기" : "Explore services", href: "/services" },
    wishlist: { title: ko ? "다음 마음에 드는 것을 찾아보세요" : "Find your next local favourite", description: ko ? "우리 동네에 새로 올라온 상품을 둘러보세요." : "See what's new in your neighbourhood.", action: ko ? "마켓 둘러보기" : "Explore Market", href: "/market" },
    keywords: { title: ko ? "찾는 상품이 아직 없나요?" : "Still looking for something?", description: ko ? "키워드를 저장하고 우리 동네 마켓도 둘러보세요." : "Save a keyword and browse your local market.", action: ko ? "마켓 둘러보기" : "Explore Market", href: "/market" },
  }[kind];

  return <aside className="ui-panel account-ad-banner" aria-label={ko ? "광고" : "Advertisement"}>
    <div className="account-ad-copy"><span>{ko ? "광고 · 타다 추천" : "Ad · From Tada"}</span><strong>{content.title}</strong><p>{content.description}</p><Link className="ui-button ui-button--secondary ui-button--sm" href={content.href}>{content.action}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>
    <img src={kind === "keywords" ? "/images/home/journey-market.png" : "/images/brand/tada-wordmark.png"} alt="" width={kind === "keywords" ? 1536 : 1965} height={kind === "keywords" ? 1024 : 800} loading="lazy" />
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
