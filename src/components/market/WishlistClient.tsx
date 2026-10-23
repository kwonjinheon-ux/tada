"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { communityWishlistResponseSchema, marketConversationResponseSchema, marketWishlistResponseSchema, serviceWishlistResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useLanguage } from "@/components/LanguageProvider";
import { DashboardAdBanner } from "@/components/dashboard/AccountPagePatterns";

export type WishlistItem = {
  id: string;
  space: "market" | "bargain" | "community" | "service";
  title: string;
  price: string;
  category: string;
  categorySlug: string | null;
  status: "Active" | "Pending" | "Sold" | "Archived";
  imageUrl: string | null;
  savedAt?: string;
};

type WishlistClientProps = { initialItems: WishlistItem[]; recentlyViewed: WishlistItem[]; initialFilter?: "all" | "service" };
type Filter = "all" | "market" | "service" | "community";
const filterLabels: Record<Filter, string> = { all: "All items", market: "Market", service: "Services", community: "Community" };
const filterIcons: Record<Filter, string> = { all: "ms-favorite", market: "ms-shopping-bag", service: "ms-build", community: "ms-forum" };
const filters: Filter[] = ["all", "market", "community", "service"];
const itemKey = (item: WishlistItem) => `${item.space}:${item.id}`;
const itemHref = (item: WishlistItem) => item.space === "community" ? `/community/${item.id}` : item.space === "service" ? `/services/${item.id}` : `/market/${item.id}`;

function matchesFilter(item: WishlistItem, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "market") return item.space === "market" || item.space === "bargain";
  return item.space === filter;
}

function WishlistSavedCard({ item, ko, editing, selected, busy, messaging, onSelect, onRemove, onMessage }: {
  item: WishlistItem;
  ko: boolean;
  editing: boolean;
  selected: boolean;
  busy: boolean;
  messaging: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMessage: () => void;
}) {
  const domain = item.space === "service" ? "service" : item.space === "community" ? "community" : "market";
  const domainLabel = domain === "service" ? ko ? "서비스" : "Services" : domain === "community" ? ko ? "커뮤니티" : "Community" : ko ? "마켓" : "Market";
  const statusLabel = item.status === "Sold" ? ko ? "거래 완료" : "Sold" : item.status === "Archived" ? ko ? "판매 종료" : "Archived" : item.status === "Pending" ? ko ? "대기 중" : "Pending" : ko ? "판매 중" : "Available";
  return <article className={`listing-row wishlist-item is-${domain}${editing ? " is-editing" : ""}`}>
    {editing ? <label className="wishlist-select"><input type="checkbox" checked={selected} onChange={onSelect} aria-label={ko ? `${item.title} 선택` : `Select ${item.title}`} /><i className={`ms ${selected ? "ms-check-box" : "ms-check-box-outline-blank"}`} aria-hidden="true" /></label> : null}
    <Link className="wishlist-item-link" href={itemHref(item)} onClick={editing ? (event) => { event.preventDefault(); onSelect(); } : undefined} aria-label={editing ? ko ? `${item.title} 선택 전환` : `Toggle selection for ${item.title}` : ko ? `${item.title} 상세 보기` : `View ${item.title}`}>
      <span className="listing-row-media">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="wishlist-text-only-icon"><i className={`ms ${domain === "community" ? "ms-description" : "ms-build"}`} aria-hidden="true" /></span>}</span>
      <span className="listing-row-body"><span className="wishlist-card-labels"><span className={`wishlist-domain-label is-${domain}`}><i className={`ms ${filterIcons[domain]}`} aria-hidden="true" />{domainLabel}</span>{domain === "market" ? <span className={`wishlist-card-status is-${item.status.toLowerCase()}`}>{statusLabel}</span> : null}</span><strong className="wishlist-card-title">{item.title}</strong>{item.price && item.price !== "Contact for pricing" && domain !== "community" ? <strong className="listing-row-price">{item.price}</strong> : null}<small className="listing-row-meta">{item.category}</small></span>
    </Link>
    {!editing ? <Button variant="ghost" size="sm" className="wishlist-save-heart" disabled={busy} onClick={onRemove} aria-label={ko ? `${item.title} 찜 해제` : `Remove ${item.title} from saved items`}><i className="ms ms-favorite ms--outline" aria-hidden="true" /><span>{ko ? "찜 해제" : "Remove"}</span></Button> : null}
    {!editing && item.space === "market" && item.status === "Active" ? <Button variant="secondary" size="sm" className="wishlist-contact" disabled={messaging} onClick={onMessage}>{messaging ? ko ? "여는 중…" : "Opening…" : ko ? "문의하기" : "Message"}</Button> : null}
  </article>;
}

export function WishlistClient({ initialItems, recentlyViewed, initialFilter = "all" }: WishlistClientProps) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [editing, setEditing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [undoItem, setUndoItem] = useState<{ item: WishlistItem; index: number } | null>(null);
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
  const searchedItems = useMemo(() => items.filter((item) => `${item.title} ${item.category}`.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale))), [items, locale, search]);
  const visibleItems = useMemo(() => searchedItems.filter((item) => matchesFilter(item, filter)).sort((a, b) => sort === "newest" ? (b.savedAt ?? "").localeCompare(a.savedAt ?? "") : (a.savedAt ?? "").localeCompare(b.savedAt ?? "")), [filter, searchedItems, sort]);
  const selectedItems = items.filter((item) => selectedKeys.has(itemKey(item)));

  useEffect(() => {
    if (!undoItem) return;
    const timeout = window.setTimeout(() => setUndoItem(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [undoItem]);

  const changeFilter = (next: Filter) => { setFilter(next); setSelectedKeys(new Set()); };
  const changeSearch = (next: string) => { setSearch(next); setSelectedKeys(new Set()); };
  const toggleSelected = (item: WishlistItem) => setSelectedKeys((current) => {
    const next = new Set(current);
    const key = itemKey(item);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const cancelEditing = () => { setEditing(false); setSelectedKeys(new Set()); };

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
    setDeleteNotice("");
    setItems((current) => current.filter((candidate) => itemKey(candidate) !== itemKey(item)));
    if (await updateSavedListing(item, false)) {
      setUndoItem({ item, index: originalIndex });
    } else {
      setItems((current) => {
        if (current.some((candidate) => itemKey(candidate) === itemKey(item))) return current;
        const restored = [...current];
        restored.splice(Math.min(Math.max(originalIndex, 0), restored.length), 0, item);
        return restored;
      });
      setDeleteNotice(ko ? "찜을 해제하지 못했어요. 다시 시도해 주세요." : "Could not remove this saved item. Please try again.");
    }
  };

  const undoRemove = async () => {
    if (!undoItem) return;
    const { item, index } = undoItem;
    setUndoItem(null);
    setItems((current) => {
      if (current.some((candidate) => itemKey(candidate) === itemKey(item))) return current;
      const restored = [...current];
      restored.splice(Math.min(Math.max(index, 0), restored.length), 0, { ...item, savedAt: new Date().toISOString() });
      return restored;
    });
    if (!await updateSavedListing(item, true)) {
      setItems((current) => current.filter((candidate) => itemKey(candidate) !== itemKey(item)));
      setDeleteNotice(ko ? "찜을 다시 저장하지 못했어요. 상세 화면에서 다시 찜해 주세요." : "Could not restore this saved item. Please save it again from its detail page.");
    }
  };

  const removeCategory = async () => {
    if (!deleteTargets || deletingAll) return;
    setDeletingAll(true);
    const failedKeys = new Set<string>();
    for (const item of deleteTargets) {
      if (await updateSavedListing(item, false)) {
        setItems((current) => current.filter((candidate) => itemKey(candidate) !== itemKey(item)));
      } else failedKeys.add(itemKey(item));
    }
    setDeletingAll(false);
    setDeleteTargets(null);
    setSelectedKeys(failedKeys);
    setEditing(failedKeys.size > 0);
    setDeleteNotice(failedKeys.size ? ko ? `${failedKeys.size}개의 찜을 해제하지 못했어요. 다시 시도해 주세요.` : `Could not remove ${failedKeys.size} saved items. Please try again.` : ko ? "선택한 찜을 해제했어요." : "Selected saved items removed.");
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
      else setDeleteNotice(ko ? "문의 화면을 열지 못했어요. 잠시 후 다시 시도해 주세요." : "Could not open the conversation. Please try again.");
    } finally {
      setMessagingId(null);
    }
  };

  const confirmationDialog = deleteTargets ? <DialogOverlay onClose={() => setDeleteTargets(null)} isDismissible={!deletingAll} aria-labelledby="wishlist-delete-title" aria-describedby="wishlist-delete-description">
    <section className="service-delete-dialog-panel" onKeyDown={(event) => { if (event.key === "Escape" && !deletingAll) setDeleteTargets(null); }}>
      <h2 id="wishlist-delete-title">{legacy ? `${categoryName} 찜을 모두 삭제할까요?` : ko ? `선택한 찜 ${deleteTargets.length}개를 해제할까요?` : `Remove ${deleteTargets.length} selected items?`}</h2>
      <p id="wishlist-delete-description">{legacy ? `${categoryName} 카테고리의 찜 ${deleteTargets.length}개가 위시리스트에서 모두 사라집니다. 게시글 원본은 삭제되지 않습니다.` : ko ? "선택한 항목만 찜 목록에서 사라집니다. 원본 상품·글·서비스는 삭제되지 않아요." : "Only the selected items leave your saved list. The original listings and posts are not deleted."}</p>
      <p>{deletingAll ? ko ? "찜을 해제하고 있어요…" : "Removing saved items…" : ko ? "팝업 바깥을 누르면 닫힙니다." : "Tap outside to close this dialog."}</p>
      <div><Button variant="ghost" autoFocus disabled={deletingAll} onClick={() => setDeleteTargets(null)}>{ko ? "취소" : "Cancel"}</Button><Button variant="ghost" className="is-danger" disabled={deletingAll} onClick={() => void removeCategory()}>{deletingAll ? ko ? "해제 중…" : "Removing…" : ko ? `${deleteTargets.length}개 찜 해제` : `Remove ${deleteTargets.length}`}</Button></div>
    </section>
  </DialogOverlay> : null;

  if (!legacy) return <div className="dashboard-content profile-settings-content wishlist-content account-modern account-wishlist">
    <header className="wishlist-page-intro"><h1>{ko ? "찜 목록" : "Saved items"}</h1><p>{ko ? "마음에 담아둔 상품과 글, 서비스를 한눈에 살펴보세요." : "Find your saved items, posts and services in one place."}</p></header>
    <div className="wishlist-redesign-layout"><div className="wishlist-main-column">
      <form className="wishlist-search" role="search" onSubmit={(event) => event.preventDefault()}><i className="ms ms-search" aria-hidden="true" /><input className="ui-input" type="search" value={search} onChange={(event) => changeSearch(event.target.value)} aria-label={ko ? "찜 목록 검색" : "Search saved items"} placeholder={ko ? "찜한 상품, 글, 서비스 검색" : "Search your saved items"} />{search ? <IconButton type="button" onClick={() => changeSearch("")} aria-label={ko ? "검색어 지우기" : "Clear search"}><i className="ms ms-close" aria-hidden="true" /></IconButton> : null}</form>
      <div className="wishlist-tabs" role="tablist" aria-label={ko ? "찜 목록 필터" : "Saved item filters"}>{filters.map((option) => <button className={filter === option ? "is-active" : ""} type="button" role="tab" key={option} aria-selected={filter === option} onClick={() => changeFilter(option)}>{option !== "all" ? <i className={`ms ${filterIcons[option]} is-${option}`} aria-hidden="true" /> : null}{ko ? { all: "전체", market: "마켓", community: "커뮤니티", service: "서비스" }[option] : filterLabels[option]}<b>{searchedItems.filter((item) => matchesFilter(item, option)).length}</b></button>)}</div>
      <div className="wishlist-toolbar"><label className="wishlist-sort"><span className="sr-only">{ko ? "찜 목록 정렬" : "Sort saved items"}</span><select className="ui-input" value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")}><option value="newest">{ko ? "최신순" : "Newest"}</option><option value="oldest">{ko ? "오래된순" : "Oldest"}</option></select><i className="ms ms-expand-more" aria-hidden="true" /></label><Button variant="secondary" size="sm" onClick={() => editing ? cancelEditing() : (setEditing(true), setUndoItem(null))}><i className={`ms ${editing ? "ms-close" : "ms-edit"}`} aria-hidden="true" />{editing ? ko ? "취소" : "Cancel" : ko ? "편집" : "Edit"}</Button></div>
      {editing ? <div className="wishlist-edit-bar"><label className="wishlist-select-all"><input type="checkbox" checked={visibleItems.length > 0 && visibleItems.every((item) => selectedKeys.has(itemKey(item)))} onChange={(event) => setSelectedKeys(event.target.checked ? new Set(visibleItems.map(itemKey)) : new Set())} aria-label={ko ? "현재 결과 전체 선택" : "Select all visible results"} />{ko ? "전체 선택" : "Select all"}</label><strong>{ko ? `${selectedItems.length}개 선택됨` : `${selectedItems.length} selected`}</strong><Button variant="ghost" className="is-danger" size="sm" disabled={!selectedItems.length || updatingIds.size > 0 || deletingAll} onClick={() => setDeleteTargets([...selectedItems])}><i className="ms ms-delete" aria-hidden="true" />{ko ? "선택한 찜 해제" : "Remove selected"}</Button></div> : null}
      {deleteNotice ? <p className="wishlist-action-notice" role="alert">{deleteNotice}</p> : null}
      {undoItem ? <div className="wishlist-undo" role="status"><span>{ko ? "찜을 해제했어요." : "Saved item removed."}</span><Button variant="ghost" size="sm" onClick={() => void undoRemove()}>{ko ? "실행 취소" : "Undo"}</Button></div> : null}
      {visibleItems.length ? <section className="wishlist-list" aria-label={ko ? "저장한 항목" : "Saved items"}>{visibleItems.map((item) => <WishlistSavedCard key={itemKey(item)} item={item} ko={ko} editing={editing} selected={selectedKeys.has(itemKey(item))} busy={updatingIds.has(itemKey(item))} messaging={messagingId === item.id} onSelect={() => toggleSelected(item)} onRemove={() => void removeItem(item)} onMessage={() => void openConversation(item.id)} />)}</section> : <section className="wishlist-discovery" role="status"><i className="ms ms-favorite ms--outline" aria-hidden="true" /><h2>{items.length ? ko ? "검색 결과가 없어요" : "No saved items found" : ko ? "아직 찜한 항목이 없어요" : "Nothing saved yet"}</h2><p>{items.length ? ko ? "검색어나 필터를 바꿔보세요." : "Try another search or filter." : ko ? "마음에 드는 상품, 글, 서비스를 찜해두세요." : "Save the items, posts and services you like."}</p>{items.length ? <Button variant="secondary" size="sm" onClick={() => { changeSearch(""); changeFilter("all"); }}>{ko ? "필터 초기화" : "Clear filters"}</Button> : <Link className="ui-button ui-button--primary" href="/market">{ko ? "마켓 둘러보기" : "Explore Market"}</Link>}</section>}
    </div><aside className="wishlist-aside" aria-label={ko ? "최근 본 상품과 추천" : "Recently viewed and recommendations"}>
      <section className="ui-panel wishlist-overview"><h2>{ko ? "내가 찜한 항목" : "Your saved items"}</h2>{(["market", "community", "service"] as const).map((kind) => <div className={`is-${kind}`} key={kind}><span><i className={`ms ${filterIcons[kind]}`} aria-hidden="true" />{ko ? { market: "마켓", community: "커뮤니티", service: "서비스" }[kind] : filterLabels[kind]}</span><strong>{items.filter((item) => matchesFilter(item, kind)).length}</strong></div>)}</section>
      {recentlyViewed.length ? <section className="ui-panel wishlist-recently-viewed" aria-labelledby="recently-viewed-title"><h2 id="recently-viewed-title">{ko ? "최근 본 상품" : "Recently viewed"}</h2><div>{recentlyViewed.map((item) => <article key={item.id}><Link href={`/market/${item.id}`}><div>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}</div><h3>{item.title}</h3><span>{item.price}</span></Link></article>)}</div></section> : null}
      <DashboardAdBanner kind="wishlist" />
    </aside></div>
    {confirmationDialog}
  </div>;

  return <div className="dashboard-content profile-settings-content wishlist-content">
    <header className="wishlist-heading"><span>Manage your {items.length} saved {items.length === 1 ? "item" : "items"}</span><div className="wishlist-tabs" aria-label="Wishlist services">{filters.map((option) => <button className={filter === option ? "is-active" : ""} type="button" key={option} aria-pressed={filter === option} onClick={() => changeFilter(option)}>{filterLabels[option]}</button>)}</div></header>
    <Button variant="ghost" className="bulk-action-button is-danger" disabled={!visibleItems.length || updatingIds.size > 0 || deletingAll} onClick={() => { setDeleteNotice(""); setDeleteTargets([...visibleItems]); }}><i className="ms ms-delete" aria-hidden="true" />완전 삭제</Button>
    {deleteNotice ? <p className="wishlist-action-notice" role="status">{deleteNotice}</p> : null}
    {confirmationDialog}
    {visibleItems.length ? <section className="wishlist-list" aria-label="Saved items">{visibleItems.map((item) => <article className={`listing-row wishlist-item wishlist-item--${item.space} ${item.status === "Sold" ? "is-sold" : ""}`} key={itemKey(item)}>
      <div className="listing-row-media">{item.space === "community" ? <span className="wishlist-text-only-icon" aria-label="Text-only community post"><i className="ms ms-description" aria-hidden="true" /></span> : <img src={item.imageUrl ?? "/images/logo.png"} alt="" />}</div>
      <div className="listing-row-body"><div className="listing-row-title"><h2>{item.title}</h2>{item.space !== "community" ? <span className={`is-${item.status.toLowerCase()}`}>{item.status}</span> : null}</div>{item.space !== "community" ? <strong className="listing-row-price">{item.price}</strong> : null}<small className="listing-row-meta">{item.space === "service" ? "Service" : item.space === "community" ? "Community" : item.category}</small></div>
      <div className="listing-row-actions wishlist-item-actions"><Link href={itemHref(item)}>{item.space === "community" ? "View post" : item.space === "service" ? "View service" : "View listing"}<i className="ms ms-chevron-right" aria-hidden="true" /></Link>{item.space === "market" ? <button className="wishlist-secondary-action" type="button" disabled={messagingId === item.id} onClick={() => void openConversation(item.id)}>{messagingId === item.id ? "Opening..." : "Message"}</button> : null}<button className="wishlist-remove-action" type="button" disabled={updatingIds.has(itemKey(item))} aria-label={`Remove ${item.title} from saved items`} onClick={() => void removeItem(item)}><i className="ms ms-close" aria-hidden="true" /><span>Remove</span></button></div>
    </article>)}</section> : <section className="wishlist-discovery" aria-labelledby="wishlist-discovery-title"><div className="wishlist-discovery-icon"><i className="ms ms-search" aria-hidden="true" /></div><h2 id="wishlist-discovery-title">Looking for more?</h2><p>{items.length ? "There are no saved items in this service." : "Explore Market or Community and save posts you want to revisit."}</p><div><Link href="/market">Explore Market <i className="ms ms-open-in-new" aria-hidden="true" /></Link><Link href="/community">Explore Community <i className="ms ms-open-in-new" aria-hidden="true" /></Link></div></section>}
    {recentlyViewed.length ? <section className="wishlist-recently-viewed" aria-labelledby="recently-viewed-title"><h2 id="recently-viewed-title">Recently viewed</h2><div>{recentlyViewed.map((item) => <article key={item.id}><Link href={`/market/${item.id}`}><div><img src={item.imageUrl ?? "/images/logo.png"} alt="" /></div><h3>{item.title}</h3><span>{item.price}</span></Link></article>)}</div></section> : null}
  </div>;
}
