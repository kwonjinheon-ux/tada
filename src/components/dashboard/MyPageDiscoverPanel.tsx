"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

/** Reusable local-discovery entry point for new and returning members. */
export function MyPageDiscoverPanel() {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const say = (en: string, kr: string) => ko ? kr : en;
  const destinations = [
    { image: "/images/home/hamilton-waikato-hero.png", title: say("Find your next local discovery.", "우리 동네에서 새로운 발견을."), text: say("Good finds, great neighbours. All on Tada.", "좋은 물건과 좋은 이웃을 타다에서 만나세요."), href: "/market", action: say("Explore Market", "마켓 둘러보기"), area: "market" },
    { image: "/images/home/journey-services.png", title: say("Need a hand?", "도움이 필요하세요?"), text: say("Find local help for everyday life.", "일상에 필요한 도움을 가까운 곳에서."), href: "/services", action: say("Browse services", "서비스 둘러보기"), area: "services" },
    { image: "/images/home/journey-jobs.png", title: say("Your next opportunity", "새로운 기회를 찾아보세요"), text: say("Discover work in your community.", "우리 동네의 일자리를 만나보세요."), href: "/jobs", action: say("Explore jobs", "일자리 둘러보기"), area: "community" },
  ];

  return <section className="ui-panel my-page-panel my-page-discovery" aria-label={say("Explore more on Tada", "타다에서 더 둘러보기")}>
    <header className="my-page-heading"><h2>{say("Explore Tada", "타다 둘러보기")}</h2></header>
    <div className="my-page-discovery-list">{destinations.map((destination) => <article className={`my-page-promo is-${destination.area}`} key={destination.href}>
      <img src={destination.image} alt="" />
      <div><h3>{destination.title}</h3><p>{destination.text}</p><Link className="ui-button ui-button--secondary ui-button--sm" href={destination.href}>{destination.action}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>
    </article>)}</div>
  </section>;
}
