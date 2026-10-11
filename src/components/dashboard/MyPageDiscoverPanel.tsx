"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/components/LanguageProvider";

/** Reusable local-discovery entry point for new and returning members. */
export function MyPageDiscoverPanel({ variant = "list" }: { variant?: "list" | "carousel" }) {
  const [active, setActive] = useState(0);
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const say = (en: string, kr: string) => ko ? kr : en;
  const destinations = [
    { image: "/images/home/hamilton-waikato-hero.png", title: say("Find your next local discovery.", "우리 동네에서 새로운 발견을."), text: say("Good finds, great neighbours. All on Tada.", "좋은 물건과 좋은 이웃을 타다에서 만나세요."), href: "/market", action: say("Explore Market", "마켓 둘러보기"), area: "market" },
    { image: "/images/home/journey-services.png", title: say("Need a hand?", "도움이 필요하세요?"), text: say("Find local help for everyday life.", "일상에 필요한 도움을 가까운 곳에서."), href: "/services", action: say("Browse services", "서비스 둘러보기"), area: "services" },
    { image: "/images/home/journey-jobs.png", title: say("Your next opportunity", "새로운 기회를 찾아보세요"), text: say("Discover work in your community.", "우리 동네의 일자리를 만나보세요."), href: "/jobs", action: say("Explore jobs", "일자리 둘러보기"), area: "community" },
  ];

  if (variant === "carousel") {
    const destination = destinations[active];
    return <section className="ui-panel my-page-panel my-page-discovery" aria-label={say("Explore your neighbourhood", "동네 둘러보기")}>
      <header className="my-page-heading"><h2>{say("Explore locally", "동네 둘러보기")}</h2><div className="my-page-discovery-controls"><span>{active + 1} / {destinations.length}</span><Button variant="ghost" size="sm" aria-label={say("Previous", "이전 카드")} onClick={() => setActive((active + destinations.length - 1) % destinations.length)}><i className="ms ms-chevron-left" aria-hidden="true" /></Button><Button variant="ghost" size="sm" aria-label={say("Next", "다음 카드")} onClick={() => setActive((active + 1) % destinations.length)}><i className="ms ms-chevron-right" aria-hidden="true" /></Button></div></header>
      <div aria-live="polite"><Link href={destination.href} className={`my-page-discovery-slide is-${destination.area}`}><img src={destination.image} alt="" /><strong>{destination.action}</strong><p>{destination.text}</p></Link></div>
      <div className="my-page-discovery-dots">{destinations.map((item, index) => <Button key={item.href} variant="ghost" size="sm" aria-label={item.action} aria-pressed={active === index} onClick={() => setActive(index)}><span /></Button>)}</div>
    </section>;
  }
  return <section className="ui-panel my-page-panel my-page-discovery" aria-label={say("Explore more on Tada", "타다에서 더 둘러보기")}>
    <header className="my-page-heading"><h2>{say("Explore Tada", "타다 둘러보기")}</h2></header>
    <div className="my-page-discovery-list">{destinations.map((destination) => <article className={`my-page-promo is-${destination.area}`} key={destination.href}>
      <img src={destination.image} alt="" />
      <div><h3>{destination.title}</h3><p>{destination.text}</p><Link className="ui-button ui-button--secondary ui-button--sm" href={destination.href}>{destination.action}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>
    </article>)}</div>
  </section>;
}
