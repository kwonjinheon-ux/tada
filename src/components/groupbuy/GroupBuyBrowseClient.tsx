"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrowseResultsToolbar } from "@/components/browse/BrowseResultsToolbar";
import { useLanguage } from "@/components/LanguageProvider";
import { GroupBuyCard } from "@/components/groupbuy/GroupBuyCard";
import { ListPagination } from "@/components/ui/ListPagination";
import { parsePageParam, totalPageCount } from "@/lib/list-pagination";
import { groupBuyText, type GroupBuy, type GroupBuyStatus } from "@/data/groupBuy";

const filters: Array<GroupBuyStatus | "all"> = ["all", "open", "closing-soon", "closed"];
/** Group buy cards are taller than a listing card, so a page holds fewer. */
const GROUP_BUY_PAGE_SIZE = 24;

export function GroupBuyBrowseClient() {
  const { t, locale } = useLanguage();
  const text = groupBuyText(locale);
  const [status, setStatus] = useState<GroupBuyStatus | "all">("all");
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;
    fetch("/api/groupbuy")
      .then(async (response) => {
        if (!response.ok) return [];
        const body = await response.json() as { data?: GroupBuy[] };
        return body.data ?? [];
      })
      .then((data) => { if (active) setGroupBuys(data); })
      .catch(() => { if (active) setGroupBuys([]); });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => groupBuys.filter((groupBuy) => status === "all" || groupBuy.status === status), [groupBuys, status]);
  // The whole feed already lives on the client, so a page is a slice of it —
  // the URL still carries the page so a link to one survives a reload.
  const totalPages = totalPageCount(visible.length, GROUP_BUY_PAGE_SIZE);
  const page = parsePageParam(searchParams.get("page") ?? undefined, totalPages);
  const pageItems = visible.slice((page - 1) * GROUP_BUY_PAGE_SIZE, page * GROUP_BUY_PAGE_SIZE);

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
        {pageItems.map((groupBuy) => <GroupBuyCard key={groupBuy.id} groupBuy={groupBuy} />)}
      </div>

      <ListPagination page={page} totalPages={totalPages} label="Group buy pages" />
    </section>
  );
}
