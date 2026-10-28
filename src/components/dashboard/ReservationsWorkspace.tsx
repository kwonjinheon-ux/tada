"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { AccountPageIntro, AccountWorkspaceAside } from "@/components/dashboard/AccountPagePatterns";
import { ListPagination } from "@/components/ui/ListPagination";
import { ListSearchField } from "@/components/ui/ListSearchField";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { formatMarketPrice } from "@/lib/market/format-price";

export type ReservationView = "all" | "attention" | "buying" | "selling";
export type ReservationStatus = "requested" | "confirmed" | "on_the_way" | "picked_up" | "declined" | "cancelled" | "expired" | "no_show";
export type ReservationListItem = {
  id: string;
  listingId: string;
  itemId: string;
  title: string;
  saleTitle: string;
  imageUrl: string;
  amountCents: number;
  status: ReservationStatus;
  role: "buying" | "selling";
  createdAt: string;
  pickupStartAt: string | null;
};

const views: ReservationView[] = ["all", "attention", "buying", "selling"];
const closed = new Set<ReservationStatus>(["picked_up", "declined", "cancelled", "expired", "no_show"]);

function ReservationRow({ item }: { item: ReservationListItem }) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const title = item.title || (ko ? "예약 상품" : "Reserved item");
  const saleTitle = item.saleTitle || (ko ? "알뜰거래" : "Bargain sale");
  const seller = item.role === "selling";
  const active = !closed.has(item.status);
  const managePickup = seller && active;
  const href = managePickup ? `/market/${item.listingId}/items/${item.itemId}/edit` : `/market/${item.listingId}`;
  const status = item.status === "requested" ? seller ? ["Response needed", "답변 필요"] : ["Waiting for seller", "판매자 확인 대기"]
    : item.status === "confirmed" ? ["Confirmed", "예약 확정"]
    : item.status === "on_the_way" ? ["On the way", "이동 중"]
    : item.status === "picked_up" ? ["Picked up", "수령 완료"]
    : item.status === "declined" ? ["Declined", "거절됨"]
    : item.status === "cancelled" ? ["Cancelled", "취소됨"]
    : item.status === "expired" ? ["Expired", "만료됨"] : ["Not picked up", "미수령"];
  const action = managePickup ? item.status === "requested" ? ["Review request", "요청 확인"] : ["Manage pickup", "수령 관리"]
    : !seller && active ? item.status === "requested" ? ["View reservation", "예약 보기"] : ["Check pickup", "수령 정보 확인"]
    : ["View item", "상품 보기"];
  const created = new Intl.DateTimeFormat(ko ? "ko-KR" : "en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.createdAt));
  const pickup = item.pickupStartAt && active ? new Intl.DateTimeFormat(ko ? "ko-KR" : "en-NZ", { month: "short", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(item.pickupStartAt)) : null;

  return <article className={`listing-row reservation-row is-${item.status}`}>
    <Link className="reservation-row-main" href={href} aria-label={ko ? `${title}, ${status[1]}, ${action[1]}` : `${title}, ${status[0]}, ${action[0]}`}>
    <span className="listing-row-media"><img src={item.imageUrl} alt="" loading="lazy" /></span>
    <div className="listing-row-body">
      <div className="reservation-row-labels"><span className="reservation-role"><i className={`ms ${seller ? "ms-sell" : "ms-shopping-bag"}`} aria-hidden="true" />{seller ? ko ? "판매" : "Selling" : ko ? "구매" : "Buying"}</span><span className={`reservation-status is-${item.status}`}>{status[ko ? 1 : 0]}</span></div>
      <h2>{title}</h2>
      <strong className="listing-row-price">{formatMarketPrice(item.amountCents)}</strong>
      {pickup ? <time className="reservation-pickup-time" dateTime={item.pickupStartAt!}><i className="ms ms-event-available" aria-hidden="true" />{ko ? "수령 예정" : "Pickup"} · {pickup}</time> : null}
      <small className="listing-row-meta">{saleTitle} · {ko ? "예약" : "Reserved"} {created}</small>
    </div>
    <span className={`ui-button ui-button--sm reservation-row-action${seller && item.status === "requested" ? " is-urgent" : ""}`}>{action[ko ? 1 : 0]}<i className="ms ms-arrow-forward" aria-hidden="true" /></span>
    </Link>
  </article>;
}

export function ReservationsWorkspace({ items, counts, view, page, totalPages, term, loadError, excludeCancelled, excludeCompleted }: {
  items: ReservationListItem[];
  counts: Record<ReservationView, number>;
  view: ReservationView;
  page: number;
  totalPages: number;
  term: string;
  loadError: boolean;
  excludeCancelled: boolean;
  excludeCompleted: boolean;
}) {
  const { locale, t } = useLanguage();
  const ko = locale === "ko";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = Number(excludeCancelled) + Number(excludeCompleted);
  const toggleFilter = (key: "excludeCancelled" | "excludeCompleted", active: boolean) => {
    const next = new URLSearchParams(searchParams.toString());
    if (active) next.delete(key);
    else next.set(key, "1");
    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };
  const hrefFor = (target: ReservationView | "clear") => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("page");
    if (target === "clear") { next.delete("q"); next.delete("view"); }
    else if (target === "all") next.delete("view");
    else next.set("view", target);
    return next.size ? `${pathname}?${next}` : pathname;
  };
  const labels: Record<ReservationView, [string, string]> = { all: ["All", "전체"], attention: ["Needs reply", "답변 필요"], buying: ["Buying", "구매"], selling: ["Selling", "판매"] };
  const emptyTitle = term ? ["No matching reservations", "일치하는 예약이 없어요"]
    : view === "attention" ? ["Nothing needs a reply", "답변할 예약이 없어요"]
    : view === "buying" ? ["No purchase reservations", "구매 예약이 없어요"]
    : view === "selling" ? ["No sale reservations", "판매 예약이 없어요"] : ["No reservations yet", "아직 예약이 없어요"];

  return <section className="dashboard-content manage-listings-content account-modern account-workspace account-reservations">
    <AccountPageIntro title={t("reservationsAndPickups")} description={ko ? "예약 상태를 확인하고 다음 행동으로 바로 이동하세요." : "Check each reservation and take the next step."} backToMyPage />
    <div className="account-content-rail-layout reservation-layout">
      <div className="reservation-main">
        <nav className="manage-listings-category-tabs reservation-filter-tabs" aria-label={ko ? "예약 필터" : "Reservation filters"}>{views.map((target) => <Link key={target} className={`manage-listings-category-tab${view === target ? " is-active" : ""}`} href={hrefFor(target)} aria-current={view === target ? "page" : undefined}>{labels[target][ko ? 1 : 0]} <b>{counts[target]}</b></Link>)}</nav>
        <div className="reservation-toolbar"><div className="reservation-search"><ListSearchField placeholder="Search reserved items" copyKey="reservationSearch" actionKey="ownedListingSearchAction" submitInField /></div><IconButton className={`reservation-filter-toggle${activeFilterCount ? " is-active" : ""}`} aria-label={ko ? "예약 상태 필터" : "Reservation status filters"} aria-expanded={filtersOpen} aria-controls={filtersOpen ? "reservation-status-filters" : undefined} onClick={() => setFiltersOpen(!filtersOpen)}><i className="ms ms-tune" aria-hidden="true" />{activeFilterCount ? <span className="reservation-filter-count">{activeFilterCount}</span> : null}</IconButton></div>
        {filtersOpen ? <div className="ui-panel reservation-status-filters" id="reservation-status-filters" role="group" aria-label={ko ? "예약 상태 제외" : "Exclude reservation statuses"}><span>{ko ? "목록에서 제외" : "Hide from list"}</span><Button variant="secondary" size="sm" pill aria-pressed={excludeCancelled} className={excludeCancelled ? "is-active" : ""} onClick={() => toggleFilter("excludeCancelled", excludeCancelled)}>{excludeCancelled ? <i className="ms ms-check" aria-hidden="true" /> : null}{ko ? "취소 제외" : "Hide cancelled"}</Button><Button variant="secondary" size="sm" pill aria-pressed={excludeCompleted} className={excludeCompleted ? "is-active" : ""} onClick={() => toggleFilter("excludeCompleted", excludeCompleted)}>{excludeCompleted ? <i className="ms ms-check" aria-hidden="true" /> : null}{ko ? "수령 완료 제외" : "Hide completed pickups"}</Button></div> : null}
        {activeFilterCount ? <div className="reservation-applied-filters" aria-label={ko ? "적용된 예약 필터" : "Applied reservation filters"}>{excludeCancelled ? <Button variant="secondary" size="sm" pill className="account-applied-chip" aria-label={ko ? "취소 제외 해제" : "Show cancelled reservations"} onClick={() => toggleFilter("excludeCancelled", true)}>{ko ? "취소 제외" : "Hide cancelled"}<i className="ms ms-close" aria-hidden="true" /></Button> : null}{excludeCompleted ? <Button variant="secondary" size="sm" pill className="account-applied-chip" aria-label={ko ? "수령 완료 제외 해제" : "Show completed pickups"} onClick={() => toggleFilter("excludeCompleted", true)}>{ko ? "수령 완료 제외" : "Hide completed pickups"}<i className="ms ms-close" aria-hidden="true" /></Button> : null}</div> : null}
        {loadError ? <div className="manage-listings-empty" role="alert"><i className="ms ms-error" aria-hidden="true" /><h2>{ko ? "예약을 불러오지 못했어요" : "We couldn't load reservations"}</h2><Button onClick={() => router.refresh()}>{ko ? "다시 시도" : "Try again"}</Button></div>
          : items.length ? <div className="ui-panel account-workspace-list reservation-list"><div className="manage-listings-grid">{items.map((item) => <ReservationRow item={item} key={item.id} />)}</div></div>
          : <div className="manage-listings-empty"><i className="ms ms-event-available" aria-hidden="true" /><h2>{emptyTitle[ko ? 1 : 0]}</h2><p>{view === "all" && !term ? ko ? "상품을 예약하거나 내 상품에 예약이 들어오면 여기에 표시돼요." : "Your purchase and sale reservations will appear here." : ko ? "다른 필터를 선택하거나 검색어를 바꿔 보세요." : "Try another filter or search term."}</p><Link href={view === "all" && !term ? "/market" : hrefFor("clear")}>{view === "all" && !term ? ko ? "마켓 둘러보기" : "Explore Market" : ko ? "전체 예약 보기" : "Show all reservations"}</Link></div>}
        {!loadError ? <ListPagination page={page} totalPages={totalPages} label={ko ? "예약 페이지" : "Reservation pages"} /> : null}
      </div>
      <AccountWorkspaceAside kind="reservations" />
    </div>
  </section>;
}
