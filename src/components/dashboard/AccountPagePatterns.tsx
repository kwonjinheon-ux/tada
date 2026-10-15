"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

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
    <img src="/images/brand/tada-wordmark.png" alt="" width={1965} height={800} loading="lazy" />
  </aside>;
}
