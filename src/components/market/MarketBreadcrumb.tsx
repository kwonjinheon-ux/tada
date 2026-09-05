"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export function MarketBreadcrumb({ current, groupBuyId, groupBuyTitle }: { current: string; groupBuyId?: string; groupBuyTitle?: string }) {
  const { locale } = useLanguage();
  const isKorean = locale === "ko";

  return (
    <nav className="detail-breadcrumb" aria-label={isKorean ? "마켓 카테고리 경로" : "Market category breadcrumb"}>
      <Link href="/market">{isKorean ? "마켓" : "Market"}</Link>
      <i className="ms ms-chevron-right" aria-hidden="true" />
      <Link href="/market/groupbuy">{isKorean ? "공동구매" : "Group buys"}</Link>
      {groupBuyId && groupBuyTitle ? <><i className="ms ms-chevron-right" aria-hidden="true" /><Link href={`/market/groupbuy/${groupBuyId}`}>{groupBuyTitle}</Link></> : null}
      <i className="ms ms-chevron-right" aria-hidden="true" />
      <span>{current}</span>
    </nav>
  );
}
