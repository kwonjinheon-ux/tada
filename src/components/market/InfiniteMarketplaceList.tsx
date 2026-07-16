"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MarketplaceItem = {
  id: string;
  title: string;
  price: string | number;
  thumbnailUrl: string;
  createdAt: string;
};

type ItemsApiResponse = MarketplaceItem[] | {
  items: MarketplaceItem[];
  hasMore?: boolean;
};

type InfiniteMarketplaceListProps = {
  className?: string;
  limit?: number;
};

const DEFAULT_LIMIT = 12;
const SCROLL_RESTORE_KEY = "tada-marketplace-scroll";
const LIST_CACHE_KEY = "tada-marketplace-items-cache";

function formatPrice(price: MarketplaceItem["price"]) {
  if (typeof price === "string") return price;

  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: price % 1 === 0 ? 0 : 2,
  }).format(price);
}

function formatDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-NZ", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getCachedList() {
  try {
    const cached = sessionStorage.getItem(LIST_CACHE_KEY);
    return cached ? JSON.parse(cached) as { items: MarketplaceItem[]; hasMore: boolean; offset: number } : null;
  } catch {
    return null;
  }
}

export function InfiniteMarketplaceList({ className = "", limit = DEFAULT_LIMIT }: InfiniteMarketplaceListProps) {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadItems = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/items?offset=${offset}&limit=${limit}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("Unable to load marketplace items.");
      }

      const payload = await response.json() as ItemsApiResponse;
      const nextItems = Array.isArray(payload) ? payload : payload.items;
      const nextHasMore = Array.isArray(payload) ? nextItems.length >= limit : payload.hasMore ?? nextItems.length >= limit;

      setItems((currentItems) => {
        const seenIds = new Set(currentItems.map((item) => item.id));
        const dedupedItems = nextItems.filter((item) => !seenIds.has(item.id));
        const updatedItems = [...currentItems, ...dedupedItems];

        sessionStorage.setItem(LIST_CACHE_KEY, JSON.stringify({
          items: updatedItems,
          hasMore: nextHasMore,
          offset: offset + nextItems.length,
        }));

        return updatedItems;
      });
      setOffset((currentOffset) => currentOffset + nextItems.length);
      setHasMore(nextHasMore);
      hasMoreRef.current = nextHasMore;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load marketplace items.");
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    const cached = getCachedList();

    if (cached) {
      setItems(cached.items);
      setOffset(cached.offset);
      setHasMore(cached.hasMore);
      hasMoreRef.current = cached.hasMore;

      window.requestAnimationFrame(() => {
        const savedScroll = Number(sessionStorage.getItem(SCROLL_RESTORE_KEY) ?? 0);
        if (savedScroll > 0) window.scrollTo({ top: savedScroll });
      });
      return;
    }

    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    const saveScroll = () => {
      sessionStorage.setItem(SCROLL_RESTORE_KEY, String(window.scrollY));
    };

    window.addEventListener("pagehide", saveScroll);
    window.addEventListener("beforeunload", saveScroll);
    return () => {
      saveScroll();
      window.removeEventListener("pagehide", saveScroll);
      window.removeEventListener("beforeunload", saveScroll);
    };
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadItems();
        }
      },
      { rootMargin: "480px 0px" },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loadItems]);

  return (
    <section className={`infinite-market-list ${className}`} aria-label="Second-hand marketplace items">
      <div className="infinite-market-grid">
        {items.map((item) => (
          <article className="infinite-market-card" key={item.id}>
            <div className="infinite-market-media">
              <img src={item.thumbnailUrl} alt={item.title} loading="lazy" decoding="async" />
            </div>
            <div className="infinite-market-body">
              <strong>{formatPrice(item.price)}</strong>
              <h2>{item.title}</h2>
              <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
            </div>
          </article>
        ))}

        {isLoading && Array.from({ length: Math.min(limit, 6) }).map((_, index) => (
          <article className="infinite-market-card is-skeleton" key={`skeleton-${index}`} aria-hidden="true">
            <div className="infinite-market-media" />
            <div className="infinite-market-body">
              <span />
              <span />
              <span />
            </div>
          </article>
        ))}
      </div>

      {error && (
        <div className="infinite-market-state is-error" role="status">
          <span>{error}</span>
          <button type="button" onClick={() => void loadItems()}>Try again</button>
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <p className="infinite-market-state" role="status">No more items to show.</p>
      )}

      <div ref={loadMoreRef} className="infinite-market-sentinel" aria-hidden="true" />
    </section>
  );
}
