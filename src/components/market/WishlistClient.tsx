"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { marketConversationResponseSchema, marketWishlistResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";

export type WishlistItem = {
  id: string;
  space: "market" | "bargain";
  title: string;
  price: string;
  category: string;
  categorySlug: string | null;
  status: "Active" | "Pending" | "Sold";
  imageUrl: string;
};

type WishlistClientProps = { initialItems: WishlistItem[]; recentlyViewed: WishlistItem[] };
type Filter = "All items" | "Market" | "Bargain";

function matchesFilter(item: WishlistItem, filter: Filter) {
  return filter === "All items" || item.space === filter.toLowerCase();
}

export function WishlistClient({ initialItems, recentlyViewed }: WishlistClientProps) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("All items");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const router = useRouter();
  const filters = useMemo<Filter[]>(() => ["All items", ...(items.some((item) => item.space === "market") ? ["Market" as const] : []), ...(items.some((item) => item.space === "bargain") ? ["Bargain" as const] : [])], [items]);
  const visibleItems = useMemo(() => items.filter((item) => matchesFilter(item, filter)), [filter, items]);

  useEffect(() => {
    if (!filters.includes(filter)) setFilter("All items");
  }, [filter, filters]);

  const itemKey = (item: WishlistItem) => `${item.space}:${item.id}`;

  const updateSavedListing = async (item: WishlistItem, saved: boolean) => {
    const key = itemKey(item);
    if (updatingIds.has(key)) return false;
    setUpdatingIds((current) => new Set(current).add(key));
    try {
      const response = await fetch(`/api/${item.space}/wishlist`, {
        method: saved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: item.id }),
      });
      const result = await readApiResponse(response, marketWishlistResponseSchema);
      return !result.error && result.data.saved === saved;
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
          {filters.map((option) => <button className={filter === option ? "is-active" : ""} type="button" key={option} onClick={() => setFilter(option)}>{option}</button>)}
        </div>
      </header>

      {visibleItems.length ? <section className="wishlist-list" aria-label="Saved items">
        {visibleItems.map((item) => <article className={`listing-row wishlist-item wishlist-item--${item.space} ${item.status === "Sold" ? "is-sold" : ""}`} key={itemKey(item)}>
          <div className="listing-row-media"><img src={item.imageUrl} alt="" /></div>
          <div className="listing-row-body">
            <div className="listing-row-title"><h2>{item.title}</h2><span className={`is-${item.status.toLowerCase()}`}>{item.status}</span></div>
            <strong className="listing-row-price">{item.price}</strong>
            <small className="listing-row-meta">{item.category}</small>
          </div>
          <div className="listing-row-actions wishlist-item-actions">
            <Link href={`/${item.space}/${item.id}`}>View listing</Link>
            {item.space === "market" ? <button className="wishlist-secondary-action" type="button" disabled={messagingId === item.id} onClick={() => void openConversation(item.id)}>{messagingId === item.id ? "Opening..." : "Send message"}</button> : null}
            <button className="wishlist-remove-action" type="button" disabled={updatingIds.has(itemKey(item))} onClick={() => void removeItem(item)}><i className="fa-solid fa-xmark" aria-hidden="true" /> Remove</button>
          </div>
        </article>)}
      </section> : <section className="wishlist-discovery" aria-labelledby="wishlist-discovery-title">
        <div className="wishlist-discovery-icon"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /></div><h2 id="wishlist-discovery-title">Looking for more?</h2><p>{items.length ? "There are no saved items in this service." : "Explore Market or Bargain and save listings you want to revisit."}</p><div><Link href={filter === "Bargain" ? "/bargain" : "/market"}>Explore {filter === "Bargain" ? "Bargain" : "Market"} <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></Link></div>
      </section>}

      {recentlyViewed.length ? <section className="wishlist-recently-viewed" aria-labelledby="recently-viewed-title">
        <h2 id="recently-viewed-title">Recently viewed</h2><div>{recentlyViewed.map((item) => <article key={item.id}><Link href={`/market/${item.id}`}><div><img src={item.imageUrl} alt="" /></div><h3>{item.title}</h3><span>{item.price}</span></Link></article>)}</div>
      </section> : null}
    </div>
  );
}
