"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { communityWishlistResponseSchema, marketConversationResponseSchema, marketWishlistResponseSchema, serviceWishlistResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { DashboardAdBanner } from "@/components/dashboard/AccountPagePatterns";

export type WishlistItem = {
  id: string;
  space: "market" | "bargain" | "community" | "service";
  title: string;
  price: string;
  category: string;
  categorySlug: string | null;
  status: "Active" | "Pending" | "Sold";
  imageUrl: string;
};

type WishlistClientProps = { initialItems: WishlistItem[]; recentlyViewed: WishlistItem[]; initialFilter?: "all" | "service" };
type Filter = "all" | "market" | "service" | "community";
const filterLabels: Record<Filter, string> = { all: "All items", market: "Market", service: "Services", community: "Community" };

function matchesFilter(item: WishlistItem, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "market") return item.space === "market" || item.space === "bargain";
  return item.space === filter;
}

export function WishlistClient({ initialItems, recentlyViewed, initialFilter = "all" }: WishlistClientProps) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const router = useRouter();
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const legacy = usePathname().endsWith("/wishlist-v0");
  const [deleteTargets, setDeleteTargets] = useState<WishlistItem[] | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState("");
  const categoryName = { all: "전체", market: "마켓", community: "커뮤니티", service: "서비스" }[filter];
  const filters: Filter[] = ["all", "market", "service", "community"];
  const visibleItems = useMemo(() => items.filter((item) => matchesFilter(item, filter)), [filter, items]);

  const itemKey = (item: WishlistItem) => `${item.space}:${item.id}`;

  const updateSavedListing = async (item: WishlistItem, saved: boolean) => {
    const key = itemKey(item);
    if (updatingIds.has(key)) return false;
    setUpdatingIds((current) => new Set(current).add(key));
    try {
      const response = await fetch(item.space === "community" ? "/api/community/wishlist" : item.space === "service" ? "/api/services/wishlist" : `/api/${item.space}/wishlist`, {
        method: saved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.space === "community" ? { postId: item.id } : item.space === "service" ? { serviceId: item.id } : { listingId: item.id }),
      });
      const result = await readApiResponse(response, item.space === "community" ? communityWishlistResponseSchema : item.space === "service" ? serviceWishlistResponseSchema : marketWishlistResponseSchema);
      return !result.error && result.data.saved === saved;
    } catch {
      return false;
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const removeItem = async (item: WishlistItem) => {
    const originalIndex = items.findIndex((candidate) => itemKey(candidate) === itemKey(item));
    setItems((current) => current.filter((candidate) => itemKey(candidate) !== itemKey(item)));
    if (!await updateSavedListing(item, false)) {
      setItems((current) => {
        if (current.some((candidate) => itemKey(candidate) === itemKey(item))) return current;
        const restored = [...current];
        restored.splice(Math.min(Math.max(originalIndex, 0), restored.length), 0, item);
        return restored;
      });
      setDeleteNotice(ko ? "찜을 해제하지 못했어요. 다시 시도해 주세요." : "Could not remove this saved item. Please try again.");
    }
  };

  const removeCategory = async () => {
    if (!deleteTargets || deletingAll) return;
    setDeletingAll(true);
    let failed = 0;
    for (const item of deleteTargets) {
      if (await updateSavedListing(item, false)) {
        setItems((current) => current.filter((candidate) => itemKey(candidate) !== itemKey(item)));
      } else failed++;
    }
    setDeletingAll(false);
    setDeleteTargets(null);
    setDeleteNotice(failed ? `${failed}개의 찜을 삭제하지 못했습니다. 다시 시도해 주세요.` : "선택한 카테고리의 찜을 모두 삭제했습니다.");
  };

  const openConversation = async (listingId: string) => {
    if (messagingId) return;
    setMessagingId(listingId);
    try {
      const response = await fetch("/api/market/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const result = await readApiResponse(response, marketConversationResponseSchema);
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent("/market/wishlist")}`);
        return;
      }
      if (result.data?.conversationId) router.push(`/market/dashboard/messages?conversation=${result.data.conversationId}`);
    } finally {
      setMessagingId(null);
    }
  };

  return (
    <div className={`dashboard-content profile-settings-content wishlist-content${legacy ? "" : " account-modern account-wishlist"}`}>
      {!legacy ? <header className="wishlist-page-intro"><h1>{ko ? "찜 목록" : "Saved for later"}</h1><p>{ko ? "마음에 담아둔 상품과 글, 서비스를 한눈에 살펴보세요." : "Find everything you saved in one place."}</p></header> : null}
      <div className={legacy ? undefined : "wishlist-redesign-layout"}>
      <div className={legacy ? undefined : "wishlist-main-column"}>
      <header className={legacy ? "wishlist-heading" : "wishlist-heading wishlist-toolbar"}>
        <div>{legacy ? <span>Manage your {items.length} saved {items.length === 1 ? "item" : "items"}</span> : <><h2>{ko ? "저장한 항목" : "Your saved items"}</h2><span>{ko ? "보고 싶은 항목을 골라 바로 이동하세요." : "Pick up where you left off."}</span></>}</div>
        {legacy ? <div className="wishlist-tabs" aria-label="Wishlist services">
          {filters.map((option) => <button className={filter === option ? "is-active" : ""} type="button" key={option} aria-pressed={filter === option} onClick={() => setFilter(option)}>{filterLabels[option]}</button>)}
        </div> : null}
      </header>
      {!legacy ? <div className="wishlist-filter-bar"><div className="wishlist-tabs" role="tablist" aria-label={ko ? "찜 목록 필터" : "Saved item filters"}>
        {filters.map((option) => <button className={filter === option ? "is-active" : ""} type="button" role="tab" key={option} aria-selected={filter === option} onClick={() => setFilter(option)}>{ko ? { all: "전체", market: "마켓", service: "서비스", community: "커뮤니티" }[option] : filterLabels[option]}<b>{items.filter((item) => matchesFilter(item, option)).length}</b></button>)}
      </div><Button variant="ghost" className="bulk-action-button is-danger" disabled={!visibleItems.length || updatingIds.size > 0 || deletingAll} onClick={() => { setDeleteNotice(""); setDeleteTargets([...visibleItems]); }}><i className="ms ms-delete" aria-hidden="true" />{ko ? "모두 찜 해제" : "Remove all saved"}</Button></div> : <Button variant="ghost" className="bulk-action-button is-danger" disabled={!visibleItems.length || updatingIds.size > 0 || deletingAll} onClick={() => { setDeleteNotice(""); setDeleteTargets([...visibleItems]); }}><i className="ms ms-delete" aria-hidden="true" />완전 삭제</Button>}
      {deleteNotice ? <p className="wishlist-action-notice" role="status">{deleteNotice}</p> : null}
      {deleteTargets ? <DialogOverlay onClose={() => setDeleteTargets(null)} isDismissible={!deletingAll} aria-labelledby="wishlist-delete-title" aria-describedby="wishlist-delete-description">
        <section className="service-delete-dialog-panel" onKeyDown={(event) => { if (event.key === "Escape" && !deletingAll) setDeleteTargets(null); }}>
          <h2 id="wishlist-delete-title">{categoryName} 찜을 모두 삭제할까요?</h2>
          <p id="wishlist-delete-description">{categoryName} 카테고리의 찜 {deleteTargets.length}개가 위시리스트에서 모두 사라집니다. 게시글 원본은 삭제되지 않습니다. 삭제 후 필요하면 게시글에서 다시 찜해야 합니다.</p>
          <p>{deletingAll ? "찜을 삭제하고 있습니다. 잠시 기다려 주세요." : "팝업 바깥을 누르면 닫힙니다."}</p>
          <div><Button variant="ghost" autoFocus disabled={deletingAll} onClick={() => setDeleteTargets(null)}>취소</Button><Button variant="ghost" className="is-danger" disabled={deletingAll} onClick={() => void removeCategory()}>{deletingAll ? "삭제 중…" : "완전 삭제"}</Button></div>
        </section>
      </DialogOverlay> : null}

      {visibleItems.length ? <section className="wishlist-list" aria-label={ko ? "저장한 항목" : "Saved items"}>
        {visibleItems.map((item) => <article className={`listing-row wishlist-item wishlist-item--${item.space} ${item.status === "Sold" ? "is-sold" : ""}`} key={itemKey(item)}>
          <div className="listing-row-media">{item.space === "community" ? <span className="wishlist-text-only-icon" aria-label="Text-only community post"><i className="ms ms-description" aria-hidden="true" /></span> : <img src={item.imageUrl} alt="" />}</div>
          <div className="listing-row-body">
            <div className="listing-row-title"><h2>{item.title}</h2>{item.space !== "community" ? <span className={`is-${item.status.toLowerCase()}`}>{ko ? { Active: "판매 중", Pending: "대기 중", Sold: "거래 완료" }[item.status] : item.status}</span> : null}</div>
            {item.space !== "community" ? <strong className="listing-row-price">{item.price}</strong> : null}
            <small className="listing-row-meta">{item.space === "service" ? ko ? "서비스" : "Service" : item.space === "community" ? ko ? "커뮤니티" : "Community" : item.category}</small>
          </div>
          <div className="listing-row-actions wishlist-item-actions">
            <Link href={item.space === "community" ? `/community/${item.id}` : item.space === "service" ? `/services/${item.id}` : `/market/${item.id}`}>{legacy || !ko ? item.space === "community" ? "View post" : item.space === "service" ? "View service" : "View listing" : item.space === "community" ? "글 보기" : item.space === "service" ? "서비스 보기" : "상품 보기"}<i className="ms ms-chevron-right" aria-hidden="true" /></Link>
            {item.space === "market" ? <button className="wishlist-secondary-action" type="button" disabled={messagingId === item.id} onClick={() => void openConversation(item.id)}>{!legacy && ko ? messagingId === item.id ? "여는 중…" : "문의하기" : messagingId === item.id ? "Opening..." : "Message"}</button> : null}
            <button className="wishlist-remove-action" type="button" disabled={updatingIds.has(itemKey(item))} aria-label={ko ? `${item.title} 찜 해제` : `Remove ${item.title} from saved items`} onClick={() => void removeItem(item)}><i className="ms ms-close" aria-hidden="true" /><span>{!legacy && ko ? "찜 해제" : "Remove"}</span></button>
          </div>
        </article>)}
      </section> : <section className="wishlist-discovery" aria-labelledby="wishlist-discovery-title">
        <div className="wishlist-discovery-icon"><i className="ms ms-search" aria-hidden="true" /></div><h2 id="wishlist-discovery-title">{!legacy && ko ? "아직 저장한 항목이 없어요" : "Looking for more?"}</h2><p>{!legacy && ko ? items.length ? "이 영역에 저장한 항목이 없어요. 다른 영역도 살펴보세요." : "우리 동네에서 마음에 드는 상품과 글을 찜해보세요." : items.length ? "There are no saved items in this service." : "Explore Market or Community and save posts you want to revisit."}</p><div><Link href="/market">{!legacy && ko ? "마켓 둘러보기" : "Explore Market"} <i className="ms ms-open-in-new" aria-hidden="true" /></Link><Link href="/community">{!legacy && ko ? "커뮤니티 둘러보기" : "Explore Community"} <i className="ms ms-open-in-new" aria-hidden="true" /></Link></div>
      </section>}

      {legacy && recentlyViewed.length ? <section className="wishlist-recently-viewed" aria-labelledby="recently-viewed-title">
        <h2 id="recently-viewed-title">{!legacy && ko ? "최근 본 상품" : "Recently viewed"}</h2><div>{recentlyViewed.map((item) => <article key={item.id}><Link href={`/market/${item.id}`}><div><img src={item.imageUrl} alt="" /></div><h3>{item.title}</h3><span>{item.price}</span></Link></article>)}</div>
      </section> : null}
      </div>
      {!legacy ? <aside className="wishlist-aside" aria-label={ko ? "찜 목록 둘러보기" : "Saved item overview"}>
        <section className="ui-panel wishlist-overview"><h2>{ko ? "내가 찜한 항목" : "Your saved items"}</h2><div><span><i className="ms ms-shopping-bag" aria-hidden="true" />{ko ? "마켓" : "Market"}</span><strong>{items.filter((item) => matchesFilter(item, "market")).length}</strong></div><div><span><i className="ms ms-build" aria-hidden="true" />{ko ? "서비스" : "Services"}</span><strong>{items.filter((item) => matchesFilter(item, "service")).length}</strong></div><div><span><i className="ms ms-forum" aria-hidden="true" />{ko ? "커뮤니티" : "Community"}</span><strong>{items.filter((item) => matchesFilter(item, "community")).length}</strong></div></section>
        {recentlyViewed.length ? <section className="ui-panel wishlist-recently-viewed" aria-labelledby="recently-viewed-title"><h2 id="recently-viewed-title">{ko ? "최근 본 상품" : "Recently viewed"}</h2><div>{recentlyViewed.slice(0, 4).map((item) => <article key={item.id}><Link href={`/market/${item.id}`}><div><img src={item.imageUrl} alt="" /></div><h3>{item.title}</h3><span>{item.price}</span></Link></article>)}</div></section> : null}
        <DashboardAdBanner kind="wishlist" />
      </aside> : null}
      </div>
    </div>
  );
}
