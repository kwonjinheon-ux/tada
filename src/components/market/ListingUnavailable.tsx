"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * A listing that is no longer there.
 *
 * The feed is cached for a short while and a link can be opened from a message
 * or a notification long after it was sent, so a reader can reach a listing the
 * seller has since removed. That is worth saying plainly, with the way back —
 * a bare 404 reads as the app being broken.
 */
export function ListingUnavailable() {
  const { locale } = useLanguage();
  const ko = locale === "ko";

  return (
    <section className="market-results">
      <div className="market-search-empty" role="status">
        <i className="ms ms-search" aria-hidden="true" />
        <strong>{ko ? "이 매물은 더 이상 없어요." : "This listing is no longer available."}</strong>
        <span>{ko ? "판매자가 내렸거나 거래가 끝난 매물이에요." : "The seller has removed it, or the trade is finished."}</span>
        <div className="market-search-empty-actions">
          <Link className="ui-button" href="/market">{ko ? "다른 매물 둘러보기" : "Browse other listings"}</Link>
        </div>
      </div>
    </section>
  );
}
