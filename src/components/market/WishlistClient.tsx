"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type WishlistItem = {
  id: string;
  title: string;
  price: string;
  category: string;
  categorySlug: string | null;
  status: "Active" | "Pending" | "Sold";
  imageUrl: string;
};

type WishlistClientProps = { initialItems: WishlistItem[]; recentlyViewed: WishlistItem[] };
type Filter = "All items" | "Goods" | "Cars" | "Real estate" | "Articles";

const filters: Filter[] = ["All items", "Goods", "Cars", "Real estate", "Articles"];

function matchesFilter(item: WishlistItem, filter: Filter) {
  if (filter === "All items") return true;
  if (filter === "Cars") return item.categorySlug === "vehicles";
  if (filter === "Real estate") return item.categorySlug === "real-estate";
  if (filter === "Articles") return item.categorySlug === "books-movies-music";
  return item.categorySlug !== "vehicles" && item.categorySlug !== "real-estate" && item.categorySlug !== "books-movies-music";
}

export function WishlistClient({ initialItems, recentlyViewed }: WishlistClientProps) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("All items");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const router = useRouter();
  const visibleItems = useMemo(() => items.filter((item) => matchesFilter(item, filter)), [filter, items]);

  const updateSavedListing = async (listingId: string, saved: boolean) => {
    if (updatingIds.has(listingId)) return false;
    setUpdatingIds((current) => new Set(current).add(listingId));
    try {
      const response = await fetch("/api/market/wishlist", {
        method: saved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      return response.ok;
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(listingId);
        return next;
      });
    }
  };

  const removeItem = async (item: WishlistItem) => {
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    if (!await updateSavedListing(item.id, false)) setItems((current) => [...current, item]);
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
      const payload = await response.json().catch(() => null) as { conversationId?: string } | null;
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent("/market/wishlist")}`);
        return;
      }
      if (payload?.conversationId) router.push(`/market/dashboard/messages?conversation=${payload.conversationId}`);
    } finally {
      setMessagingId(null);
    }
  };

  return (
    <div className="dashboard-content profile-settings-content wishlist-content">
      <header className="wishlist-heading">
        <div><span>Manage your {items.length} saved {items.length === 1 ? "item" : "items"}</span></div>
        <div className="wishlist-tabs" aria-label="Wishlist categories">
          {filters.map((option) => <button className={filter === option ? "is-active" : ""} type="button" key={option} onClick={() => setFilter(option)}>{option}</button>)}
        </div>
      </header>

      {visibleItems.length ? <section className="wishlist-list" aria-label="Saved items">
        {visibleItems.map((item) => <article className={`wishlist-item ${item.status === "Sold" ? "is-sold" : ""}`} key={item.id}>
          <div className="wishlist-item-image"><img src={item.imageUrl} alt="" />{item.status !== "Active" ? <span className={`wishlist-status ${item.status === "Sold" ? "is-sold" : ""}`}>{item.status}</span> : <span className="wishlist-status">Active</span>}</div>
          <div className="wishlist-item-main"><p>{item.category}</p><h2>{item.title}</h2><div className="wishlist-item-actions"><Link href={`/market/${item.id}`}>View listing</Link><button className="wishlist-secondary-action" type="button" disabled={messagingId === item.id} onClick={() => void openConversation(item.id)}>{messagingId === item.id ? "Opening..." : "Send message"}</button></div></div>
          <div className="wishlist-item-side"><strong>{item.price}</strong><button className="wishlist-heart" type="button" aria-label={`Remove ${item.title} from saved items`} disabled={updatingIds.has(item.id)} onClick={() => void removeItem(item)}><i className="fa-solid fa-heart" aria-hidden="true" /></button></div>
        </article>)}
      </section> : <section className="wishlist-discovery" aria-labelledby="wishlist-discovery-title">
        <div className="wishlist-discovery-icon"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /></div><h2 id="wishlist-discovery-title">Looking for more?</h2><p>{items.length ? "There are no saved items in this category." : "Explore the marketplace and save listings you want to revisit."}</p><div><Link href="/market">Explore marketplace <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></Link></div>
      </section>}

      {items.length ? <section className="wishlist-discovery" aria-labelledby="wishlist-discovery-title">
        <div className="wishlist-discovery-icon"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /></div><h2 id="wishlist-discovery-title">Looking for more?</h2><p>Explore the marketplace and save listings you want to revisit.</p><div><Link href="/market">Explore marketplace <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></Link></div>
      </section> : null}

      {recentlyViewed.length ? <section className="wishlist-recently-viewed" aria-labelledby="recently-viewed-title">
        <h2 id="recently-viewed-title">Recently viewed</h2><div>{recentlyViewed.map((item) => <article key={item.id}><Link href={`/market/${item.id}`}><div><img src={item.imageUrl} alt="" /></div><h3>{item.title}</h3><span>{item.price}</span></Link></article>)}</div>
      </section> : null}
    </div>
  );
}
