"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BrowseResultsToolbar } from "@/components/browse/BrowseResultsToolbar";
import { useLanguage } from "@/components/LanguageProvider";
import { GroupBuyCard } from "@/components/groupbuy/GroupBuyCard";
import { groupBuys, groupBuyText, type GroupBuyStatus } from "@/data/groupBuy";

const filters: Array<GroupBuyStatus | "all"> = ["all", "open", "closing-soon", "closed"];

export function GroupBuyBrowseClient() {
  const { t, locale } = useLanguage();
  const text = groupBuyText(locale);
  const [status, setStatus] = useState<GroupBuyStatus | "all">("all");

  const visible = useMemo(() => groupBuys.filter((groupBuy) => status === "all" || groupBuy.status === status), [status]);

  return (
    <section className="market-results groupbuy-results" aria-label={text.browseLabel}>
      <div className="browse-intro browse-intro--with-create">
        <div className="browse-intro-copy">
          <h1>{text.heroTitle}</h1>
          <p>{text.heroDescription}</p>
        </div>
        <Link className="browse-create-button ui-button ui-button--lg" href="/market/groupbuy/create">
          <i className="ms ms-add" aria-hidden="true" />
          <span>{text.startAction}</span>
        </Link>
      </div>

      {/* Tada holds no money, so the rules of a group buy have to be legible
          before anyone joins one. This states them once, at the top. */}
      <aside className="groupbuy-explainer" aria-label={locale === "ko" ? "공동구매 안내" : "How a group buy works"}>
        {[
          { icon: "ms-list-alt", title: locale === "ko" ? "판매자가 목록을 올려요" : "The seller posts a list", body: locale === "ko" ? "상품과 가격, 마감일을 한 번만 정합니다." : "Items, prices and a closing date, set once." },
          { icon: "ms-shopping-bag", title: locale === "ko" ? "필요한 만큼 담아요" : "You add what you need", body: locale === "ko" ? "장바구니처럼 담고 신청서를 제출합니다." : "Fill a basket and place your order." },
          { icon: "ms-payments", title: locale === "ko" ? "레퍼런스로 직접 입금" : "You pay the seller direct", body: locale === "ko" ? "Tada는 결제를 대행하지 않습니다." : "Tada never handles the money." },
        ].map(({ icon, title, body }) => (
          <article key={title}><i className={`ms ${icon}`} aria-hidden="true" /><div><strong>{title}</strong><span>{body}</span></div></article>
        ))}
      </aside>

      <BrowseResultsToolbar
        viewMode="grid"
        onViewModeChange={() => undefined}
        showViewToggle={false}
        chips={filters.map((value) => ({ value, label: value === "all" ? t("all") : text.status[value] }))}
        activeChipValue={status}
        onChipSelect={(value) => setStatus(value as GroupBuyStatus | "all")}
        chipStyle="sort"
        resultsLabel={text.count(visible.length)}
      />

      <div className="groupbuy-grid">
        {visible.map((groupBuy) => <GroupBuyCard key={groupBuy.id} groupBuy={groupBuy} />)}
      </div>
    </section>
  );
}
