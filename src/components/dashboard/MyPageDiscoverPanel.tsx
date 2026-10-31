"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/components/LanguageProvider";

/** Reusable local-discovery entry point for new and returning members. */
export function MyPageDiscoverPanel({ variant = "list" }: { variant?: "list" | "carousel" }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const say = (en: string, kr: string) => ko ? kr : en;
  const destinations = [
    { image: "/images/home/hamilton-waikato-hero.webp", title: say("Find your next local discovery.", "우리 동네에서 새로운 발견을."), text: say("Good finds, great neighbours. All on Tada.", "좋은 물건과 좋은 이웃을 타다에서 만나세요."), href: "/market", action: say("Explore Market", "마켓 둘러보기"), area: "market" },
    { image: "/images/home/journey-services.webp", title: say("Need a hand?", "도움이 필요하세요?"), text: say("Find local help for everyday life.", "일상에 필요한 도움을 가까운 곳에서."), href: "/services", action: say("Browse services", "서비스 둘러보기"), area: "services" },
    { image: "/images/home/journey-jobs.webp", title: say("Your next opportunity", "새로운 기회를 찾아보세요"), text: say("Discover work in your community.", "우리 동네의 일자리를 만나보세요."), href: "/jobs", action: say("Explore jobs", "일자리 둘러보기"), area: "community" },
  ];

  if (variant === "carousel") {
    const goTo = (index: number) => trackRef.current?.scrollTo({ left: index * trackRef.current.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    return <section className="ui-panel my-page-panel my-page-discovery" aria-label={say("Discover your neighbourhood", "동네 둘러보기")}>
      <header className="my-page-heading"><h2>{say("Discover your neighbourhood", "동네 둘러보기")}</h2></header>
      <div className="my-page-discovery-track" ref={trackRef} role="region" aria-label={say("Swipe to explore nearby", "옆으로 넘겨 동네 둘러보기")} tabIndex={0} onScroll={(event) => setActive(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}>
        {destinations.map((destination) => <Link href={destination.href} className={`my-page-discovery-slide is-${destination.area}`} key={destination.href}><img src={destination.image} alt="" /><strong>{destination.action}</strong><p>{destination.text}</p></Link>)}
      </div>
      <div className="my-page-discovery-dots">{destinations.map((item, index) => <Button key={item.href} variant="ghost" size="sm" aria-label={say(`Show ${item.action}`, `${item.action} 카드 보기`)} aria-pressed={active === index} onClick={() => goTo(index)}><span /></Button>)}</div>
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
