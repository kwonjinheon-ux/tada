"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { communityWishlistResponseSchema, marketConversationResponseSchema, marketWishlistResponseSchema, serviceWishlistResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { Button } from "@/components/ui/Button";

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

type WishlistClientProps = { initialItems: WishlistItem[]; recentlyViewed: WishlistItem[] };
type Filter = "all" | "market" | "service" | "community";
const filterLabels: Record<Filter, string> = { all: "All items", market: "Market", service: "Services", community: "Community" };

function matchesFilter(item: WishlistItem, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "market") return item.space === "market" || item.space === "bargain";
  return item.space === filter;
}

export function WishlistClient({ initialItems, recentlyViewed }: WishlistClientProps) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("all");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const router = useRouter();
  const [deleteTargets, setDeleteTargets] = useState<WishlistItem[] | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState("");
  const categoryName = { all: "전체", market: "마켓", community: "커뮤니티", service: "서비스" }[filter];
  const filters = useMemo<Filter[]>(() => ["all", ...(items.some((item) => item.space === "market" || item.space === "bargain") ? ["market" as const] : []), ...(items.some((item) => item.space === "community") ? ["community" as const] : []), "service"], [items]);
  const visibleItems = useMemo(() => items.filter((item) => matchesFilter(item, filter)), [filter, items]);

  useEffect(() => {
    if (!filters.includes(filter)) setFilter("all");
  }, [filter, filters]);

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
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    if (!await updateSavedListing(item, false)) setItems((current) => [...current, item]);
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
    <div className="dashboard-content profile-settings-content wishlist-content">
      <header className="wishlist-heading">
        <div><span>Manage your {items.length} saved {items.length === 1 ? "item" : "items"}</span></div>
        <div className="wishlist-tabs" aria-label="Wishlist services">
          {filters.map((option) => <button className={filter === option ? "is-active" : ""} type="button" key={option} onClick={() => setFilter(option)}>{filterLabels[option]}</button>)}
        </div>
      </header>
      <Button variant="ghost" className="bulk-action-button is-danger" disabled={!visibleItems.length || updatingIds.size > 0 || deletingAll} onClick={() => { setDeleteNotice(""); setDeleteTargets([...visibleItems]); }}><i className="ms ms-delete" aria-hidden="true" />완전 삭제</Button>
      {deleteNotice ? <p role="status">{deleteNotice}</p> : null}
      {deleteTargets ? <DialogOverlay onClose={() => setDeleteTargets(null)} isDismissible={!deletingAll} aria-labelledby="wishlist-delete-title" aria-describedby="wishlist-delete-description">
        <section className="service-delete-dialog-panel" onKeyDown={(event) => { if (event.key === "Escape" && !deletingAll) setDeleteTargets(null); }}>
          <h2 id="wishlist-delete-title">{categoryName} 찜을 모두 삭제할까요?</h2>
          <p id="wishlist-delete-description">{categoryName} 카테고리의 찜 {deleteTargets.length}개가 위시리스트에서 모두 사라집니다. 게시글 원본은 삭제되지 않습니다. 삭제 후 필요하면 게시글에서 다시 찜해야 합니다.</p>
          <p>{deletingAll ? "찜을 삭제하고 있습니다. 잠시 기다려 주세요." : "팝업 바깥을 누르면 닫힙니다."}</p>
          <div><Button variant="ghost" autoFocus disabled={deletingAll} onClick={() => setDeleteTargets(null)}>취소</Button><Button variant="ghost" className="is-danger" disabled={deletingAll} onClick={() => void removeCategory()}>{deletingAll ? "삭제 중…" : "완전 삭제"}</Button></div>
        </section>
      </DialogOverlay> : null}

      {visibleItems.length ? <section className="wishlist-list" aria-label="Saved items">
        {visibleItems.map((item) => <article className={`listing-row wishlist-item wishlist-item--${item.space} ${item.status === "Sold" ? "is-sold" : ""}`} key={itemKey(item)}>
          <div className="listing-row-media">{item.space === "community" ? <span className="wishlist-text-only-icon" aria-label="Text-only community post"><i className="ms ms-description" aria-hidden="true" /></span> : <img src={item.imageUrl} alt="" />}</div>
          <div className="listing-row-body">
            <div className="listing-row-title"><h2>{item.title}</h2>{item.space !== "community" ? <span className={`is-${item.status.toLowerCase()}`}>{item.status}</span> : null}</div>
            <strong className="listing-row-price">{item.price}</strong>
            <small className="listing-row-meta">{item.category}</small>
          </div>
          <div className="listing-row-actions wishlist-item-actions">
            <Link href={item.space === "community" ? `/community/${item.id}` : item.space === "service" ? `/services/${item.id}` : `/market/${item.id}`}>{item.space === "community" ? "View post" : item.space === "service" ? "View service" : "View listing"}</Link>
            {item.space === "market" ? <button className="wishlist-secondary-action" type="button" disabled={messagingId === item.id} onClick={() => void openConversation(item.id)}>{messagingId === item.id ? "Opening..." : "Send message"}</button> : null}
            <button className="wishlist-remove-action" type="button" disabled={updatingIds.has(itemKey(item))} onClick={() => void removeItem(item)}><i className="ms ms-close" aria-hidden="true" /> Remove</button>
          </div>
        </article>)}
      </section> : <section className="wishlist-discovery" aria-labelledby="wishlist-discovery-title">
        <div className="wishlist-discovery-icon"><i className="ms ms-search" aria-hidden="true" /></div><h2 id="wishlist-discovery-title">Looking for more?</h2><p>{items.length ? "There are no saved items in this service." : "Explore Market or Community and save posts you want to revisit."}</p><div><Link href="/market">Explore Market <i className="ms ms-open-in-new" aria-hidden="true" /></Link><Link href="/community">Explore Community <i className="ms ms-open-in-new" aria-hidden="true" /></Link></div>
      </section>}

      {recentlyViewed.length ? <section className="wishlist-recently-viewed" aria-labelledby="recently-viewed-title">
        <h2 id="recently-viewed-title">Recently viewed</h2><div>{recentlyViewed.map((item) => <article key={item.id}><Link href={`/market/${item.id}`}><div><img src={item.imageUrl} alt="" /></div><h3>{item.title}</h3><span>{item.price}</span></Link></article>)}</div>
      </section> : null}
    </div>
  );
}
