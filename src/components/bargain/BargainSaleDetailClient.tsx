"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { formatMarketPrice } from "@/lib/market/format-price";

export type BargainSaleDetail = {
  id: string;
  title: string;
  description: string;
  type: "moving-sale" | "garage-sale";
  location: string;
  address: string | null;
  dateLabel: string | null;
  timeLabel: string | null;
  coverImage: { src: string; alt: string };
  items: Array<{
    id: string;
    title: string;
    description: string;
    category: string | null;
    priceCents: number;
    image: { src: string; alt: string };
    status: "available" | "pending" | "sold";
  }>;
};

function statusLabel(status: BargainSaleDetail["items"][number]["status"]) {
  return status === "sold" ? "Sold" : status === "pending" ? "Reserved" : "Available";
}

export function BargainSaleDetailClient({ sale }: { sale: BargainSaleDetail }) {
  const [activeCategory, setActiveCategory] = useState("All items");
  const [searchQuery, setSearchQuery] = useState("");
  const [reservedItemIds, setReservedItemIds] = useState<string[]>([]);
  const [shareStatus, setShareStatus] = useState("");
  const categories = useMemo(() => {
    const itemCategories = sale.items
      .map((item) => item.category)
      .filter((category): category is string => Boolean(category));
    return ["All items", ...Array.from(new Set(itemCategories)).slice(0, 5)];
  }, [sale.items]);
  const visibleItems = sale.items.filter((item) => {
    const categoryMatches = activeCategory === "All items" || item.category === activeCategory;
    const searchMatches = [item.title, item.description, item.category].filter(Boolean).join(" ").toLowerCase().includes(searchQuery.trim().toLowerCase());
    return categoryMatches && searchMatches;
  });
  const directionsHref = sale.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sale.address)}` : null;
  const typeLabel = sale.type === "moving-sale" ? "Moving sale" : "Garage sale";
  const shareSale = async () => {
    const shareData = { title: sale.title, text: sale.description, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(window.location.href); setShareStatus("Link copied"); }
    } catch { return; }
    window.setTimeout(() => setShareStatus(""), 2_000);
  };
  const toggleReservation = (itemId: string) => setReservedItemIds((ids) => ids.includes(itemId) ? ids.filter((id) => id !== itemId) : [...ids, itemId]);

  return <main className="bargain-sale-detail-page">
    <PageContainer className="bargain-sale-detail-layout">
      <section className="bargain-sale-detail-overview">
        <div className="bargain-sale-detail-hero">
          <Image src={sale.coverImage.src} alt={sale.coverImage.alt} fill priority unoptimized sizes="(max-width: 1200px) 100vw, 780px" />
          <div className="bargain-sale-detail-hero-shade" />
          <div className="bargain-sale-detail-hero-content">
            <Link className="bargain-sale-detail-back" href="/bargain"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to Bargain</Link>
            <span className="bargain-sale-detail-type">{typeLabel}</span>
            <h1>{sale.title}</h1>
            <p>{sale.description}</p>
          </div>
        </div>
        <div className="bargain-sale-summary-cards">
          <section className="bargain-sale-event-card"><h2><i className="fa-regular fa-calendar-days" aria-hidden="true" /> Event logistics</h2><dl>
            {sale.dateLabel ? <div><dt><i className="fa-regular fa-calendar" aria-hidden="true" /> Date</dt><dd>{sale.dateLabel}</dd></div> : null}
            {sale.timeLabel ? <div><dt><i className="fa-regular fa-clock" aria-hidden="true" /> Time</dt><dd>{sale.timeLabel}</dd></div> : null}
            <div><dt><i className="fa-solid fa-location-dot" aria-hidden="true" /> Location</dt><dd>{sale.address ?? sale.location}</dd></div>
          </dl>{directionsHref ? <a className="bargain-sale-directions" href={directionsHref} target="_blank" rel="noreferrer">Get directions <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a> : null}</section>
          <section className="bargain-sale-host-card"><h2><i className="fa-solid fa-user" aria-hidden="true" /> Seller info</h2><div className="bargain-sale-host-profile"><span className="bargain-sale-host-avatar"><i className="fa-solid fa-house" aria-hidden="true" /></span><div><strong>Local Tada seller</strong><span><i className="fa-solid fa-star" aria-hidden="true" /> Community sale host</span></div></div><div className="bargain-sale-host-actions"><Button variant="secondary" size="sm" block><i className="fa-regular fa-message" aria-hidden="true" /> Message</Button><Button variant="secondary" size="sm" block onClick={() => void shareSale()}><i className="fa-solid fa-share-nodes" aria-hidden="true" /> Share</Button></div>{shareStatus ? <span className="bargain-sale-share-status" role="status">{shareStatus}</span> : null}</section>
        </div>
      </section>

      <section className="bargain-sale-detail-inventory" aria-labelledby="sale-inventory-title">
        <header>
          <div><h2 id="sale-inventory-title">Sale inventory ({sale.items.length} items)</h2><p>Browse items and reserve them for pickup during the sale.</p></div>
          <label className="bargain-sale-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><span className="sr-only">Search sale inventory</span><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search inventory..." /></label>
        </header>
        <div className="bargain-sale-category-tabs" aria-label="Filter sale items">{categories.map((category) => <button key={category} type="button" className={activeCategory === category ? "is-selected" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}</div>
        {visibleItems.length ? <div className="bargain-sale-detail-items">{visibleItems.map((item) => <article className={`bargain-sale-detail-item ${item.status === "sold" ? "is-sold" : ""}`} key={item.id}>
          <div className="bargain-sale-detail-item-image"><Image src={item.image.src} alt={item.image.alt} fill unoptimized sizes="(max-width: 767px) 100vw, 280px" />{item.status === "sold" ? <span>Sold</span> : <b>Available</b>}</div>
          <div className="bargain-sale-detail-item-copy"><div><h3>{item.title}</h3><strong>{formatMarketPrice(item.priceCents)}</strong></div><p>{item.description}</p><div className="bargain-sale-item-actions"><Button size="sm" block disabled={item.status === "sold"} onClick={() => toggleReservation(item.id)}>{reservedItemIds.includes(item.id) ? "Reserved" : "Reserve item"}</Button><span className={`listing-status status-${item.status}`}>{statusLabel(item.status)}</span></div></div>
        </article>)}</div> : <div className="bargain-sale-detail-empty" role="status"><i className="fa-solid fa-box-open" aria-hidden="true" /><strong>No items in this category</strong><span>Choose another category to see the sale inventory.</span></div>}
      </section>

      <aside className="bargain-sale-detail-sidebar">
        <a className="bargain-sale-map-card" href={directionsHref ?? "#event-location"} target={directionsHref ? "_blank" : undefined} rel={directionsHref ? "noreferrer" : undefined}><span className="bargain-sale-map-grid" aria-hidden="true" /><i className="fa-solid fa-location-dot" aria-hidden="true" /><span>Open event location</span></a>
        <section id="event-location" className="bargain-sale-about-card"><h2>About this sale</h2><p>{sale.description}</p><ul><li><i className="fa-solid fa-money-bill-wave" aria-hidden="true" /> Cash and card payments welcome</li><li><i className="fa-solid fa-bag-shopping" aria-hidden="true" /> Bring your own bags for larger finds</li></ul></section>
      </aside>
    </PageContainer>
  </main>;
}
