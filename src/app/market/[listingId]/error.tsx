"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * A listing that could not be read.
 *
 * Without this the page had one way to fail, and it was `notFound()` — so a
 * dropped database read told the reader the item was gone. A read that fails
 * now says so, and offers the one thing that usually works: trying again.
 */
export default function ListingDetailError({ reset }: { error: Error; reset: () => void }) {
  const { locale } = useLanguage();
  const ko = locale === "ko";

  return (
    <main className="marketplace-page">
      <section className="market-results">
        <div className="market-search-empty" role="alert">
          <i className="ms ms-error" aria-hidden="true" />
          <strong>{ko ? "지금 이 매물을 불러오지 못했어요." : "This listing could not be loaded."}</strong>
          <span>{ko ? "잠시 후 다시 시도해 주세요. 매물이 삭제된 것은 아니에요." : "Please try again in a moment — the listing has not been removed."}</span>
          <div className="market-search-empty-actions">
            <button className="ui-button" type="button" onClick={reset}>{ko ? "다시 시도" : "Try again"}</button>
            <Link className="ui-button ui-button--secondary" href="/market">{ko ? "마켓으로 돌아가기" : "Back to Market"}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
