"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { BargainSaleItemGallery } from "@/components/bargain/BargainSaleItemGallery";
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
  seller: { name: string; avatarUrl: string | null };
  viewerIsOwner: boolean;
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

export function BargainSaleDetailClient({ sale }: { sale: BargainSaleDetail }) {
  const [items, setItems] = useState(sale.items);
  const [activeCategory, setActiveCategory] = useState("All items");
  const [searchQuery, setSearchQuery] = useState("");
  const [reservedItemIds, setReservedItemIds] = useState<string[]>([]);
  const [reservingItemId, setReservingItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState({ title: "", description: "", priceCents: 0 });
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const categories = useMemo(() => {
    const itemCategories = items
      .map((item) => item.category)
      .filter((category): category is string => Boolean(category));
    return ["All items", ...Array.from(new Set(itemCategories)).slice(0, 5)];
  }, [items]);
  const visibleItems = items.filter((item) => {
    const categoryMatches = activeCategory === "All items" || item.category === activeCategory;
    const searchMatches = [item.title, item.description, item.category].filter(Boolean).join(" ").toLowerCase().includes(searchQuery.trim().toLowerCase());
    return categoryMatches && searchMatches;
  });
  const mapLocation = sale.address ?? sale.location;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapLocation)}&travelmode=driving`;
  const mapEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapLocation)}&z=15&output=embed`;
  const typeLabel = sale.type === "moving-sale" ? "Moving sale" : "Garage sale";
  const shareSale = async () => {
    const shareData = { title: sale.title, text: sale.description, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(window.location.href); setShareStatus("Link copied"); }
    } catch { return; }
    window.setTimeout(() => setShareStatus(""), 2_000);
  };
  const showActionNotice = (message: string) => {
    setActionError(null);
    setActionNotice(message);
    window.setTimeout(() => setActionNotice(null), 3_500);
  };
  const reserveItem = async (itemId: string) => {
    if (reservedItemIds.includes(itemId) || reservingItemId) return;
    setActionError(null);
    setReservingItemId(itemId);
    try {
      const response = await fetch("/api/bargain/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: sale.id, itemId }) });
      const payload = await response.json().catch(() => null) as { error?: string; reusedActiveReservation?: boolean } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to send your offer right now.");
      setReservedItemIds((ids) => [...ids, itemId]);
      showActionNotice(payload?.reusedActiveReservation ? "Your reservation offer is already pending." : "Reservation offer sent to the seller.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to send your offer right now.");
    } finally { setReservingItemId(null); }
  };
  const startEditingItem = (item: BargainSaleDetail["items"][number]) => {
    setActionError(null);
    setEditingItemId(item.id);
    setItemDraft({ title: item.title, description: item.description, priceCents: item.priceCents });
  };
  const saveItem = async (itemId: string) => {
    const title = itemDraft.title.trim();
    const description = itemDraft.description.trim();
    if (!title || !description || !Number.isInteger(itemDraft.priceCents) || itemDraft.priceCents < 0) {
      setActionError("Enter an item title, description, and valid price.");
      return;
    }
    setActionError(null);
    setSavingItemId(itemId);
    try {
      const response = await fetch(`/api/bargain/items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: sale.id, title, description, priceCents: itemDraft.priceCents }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save this item right now.");
      setItems((current) => current.map((item) => item.id === itemId ? { ...item, title, description, priceCents: itemDraft.priceCents } : item));
      setEditingItemId(null);
      showActionNotice("Item updated.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save this item right now.");
    } finally { setSavingItemId(null); }
  };

  return <main className="bargain-sale-detail-page">
    <PageContainer>
      <div className="listing-detail-back-row" aria-label="Bargain navigation">
        <Link className="listing-detail-back" href="/bargain"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to listings</Link>
        <nav className="listing-detail-category-path" aria-label="Bargain category"><Link href="/bargain">Bargain</Link><span aria-hidden="true">/</span><Link href={`/bargain?bargain=${sale.type}`}>{typeLabel}</Link></nav>
      </div>
      <div className="bargain-sale-detail-layout">
      <section className="bargain-sale-detail-overview">
        <div className="bargain-sale-detail-hero">
          <Image src={sale.coverImage.src} alt={sale.coverImage.alt} fill priority unoptimized sizes="(max-width: 1200px) 100vw, 780px" />
          <div className="bargain-sale-detail-hero-shade" />
          <div className="bargain-sale-detail-hero-content">
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
          </dl><a className="bargain-sale-directions" href={directionsHref} target="_blank" rel="noreferrer">Get directions <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a></section>
          <section className="bargain-sale-host-card"><h2><i className="fa-solid fa-user" aria-hidden="true" /> Seller info</h2><div className="bargain-sale-host-profile"><span className="bargain-sale-host-avatar">{sale.seller.avatarUrl ? <Image src={sale.seller.avatarUrl} alt="" fill unoptimized sizes="56px" /> : <span aria-hidden="true">{sale.seller.name.slice(0, 1).toUpperCase()}</span>}</span><div><strong>{sale.seller.name}</strong><span>Local Tada seller</span></div></div><div className="bargain-sale-host-actions"><Button variant="secondary" size="sm" block><i className="fa-regular fa-message" aria-hidden="true" /> Message</Button><Button variant="secondary" size="sm" block onClick={() => void shareSale()}><i className="fa-solid fa-share-nodes" aria-hidden="true" /> Share</Button></div>{shareStatus ? <span className="bargain-sale-share-status" role="status">{shareStatus}</span> : null}</section>
        </div>
      </section>

      <section className="bargain-sale-detail-inventory" aria-labelledby="sale-inventory-title">
        <header>
          <div><h2 id="sale-inventory-title">Sale inventory ({items.length} items)</h2><p>Browse items and reserve them for pickup during the sale.</p></div>
          <label className="bargain-sale-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><span className="sr-only">Search sale inventory</span><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search inventory..." /></label>
        </header>
        <div className="bargain-sale-category-tabs" aria-label="Filter sale items">{categories.map((category) => <button key={category} type="button" className={activeCategory === category ? "is-selected" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}</div>
        {actionNotice ? <p className="bargain-sale-action-notice" role="status">{actionNotice}</p> : null}
        {actionError ? <p className="bargain-sale-action-error" role="alert">{actionError}</p> : null}
        {visibleItems.length ? <div className="bargain-sale-detail-items">{visibleItems.map((item, index) => <article className={`bargain-sale-detail-item ${item.status === "sold" ? "is-sold" : ""}`} key={item.id}>
          <button className="bargain-sale-detail-item-image" type="button" onClick={() => setGalleryIndex(items.findIndex((saleItem) => saleItem.id === item.id))} aria-label={`View ${item.title} photo gallery`}><Image src={item.image.src} alt={item.image.alt} fill unoptimized sizes="(max-width: 767px) 100vw, 280px" />{item.status === "sold" ? <span>Sold</span> : <b>Available</b>}</button>
          <div className="bargain-sale-detail-item-copy">{editingItemId === item.id ? <div className="bargain-sale-item-editor"><label>Item title<input className="ui-input" value={itemDraft.title} onChange={(event) => setItemDraft((current) => ({ ...current, title: event.target.value }))} /></label><label>Price (NZD)<input className="ui-input" type="number" min="0" step="0.01" value={(itemDraft.priceCents / 100).toFixed(2)} onChange={(event) => setItemDraft((current) => ({ ...current, priceCents: Math.round(Number(event.target.value || 0) * 100) }))} /></label><label>Description<textarea className="ui-input" value={itemDraft.description} onChange={(event) => setItemDraft((current) => ({ ...current, description: event.target.value }))} /></label><div><Button size="sm" onClick={() => void saveItem(item.id)} disabled={savingItemId === item.id}>{savingItemId === item.id ? "Saving…" : "Save item"}</Button><Button variant="secondary" size="sm" onClick={() => setEditingItemId(null)}>Cancel</Button></div></div> : <><div><h3>{index + 1}. {item.title}</h3><strong>{formatMarketPrice(item.priceCents)}</strong></div><p>{item.description}</p><div className="bargain-sale-item-actions">{sale.viewerIsOwner ? <Button size="sm" block disabled={item.status === "sold"} onClick={() => startEditingItem(item)}>Edit item</Button> : <Button size="sm" block disabled={item.status === "sold" || reservingItemId === item.id || reservedItemIds.includes(item.id)} onClick={() => void reserveItem(item.id)}>{reservedItemIds.includes(item.id) ? "Offer sent" : reservingItemId === item.id ? "Sending…" : "Reserve item"}</Button>}</div></>}</div>
        </article>)}</div> : <div className="bargain-sale-detail-empty" role="status"><i className="fa-solid fa-box-open" aria-hidden="true" /><strong>No items in this category</strong><span>Choose another category to see the sale inventory.</span></div>}
      </section>

      <aside className="bargain-sale-detail-sidebar">
        <a className="bargain-sale-map-card" href={directionsHref} target="_blank" rel="noreferrer" aria-label={`Get directions to ${mapLocation}`}><iframe className="bargain-sale-map-embed" src={mapEmbedSrc} title={`Map of ${mapLocation}`} loading="lazy" tabIndex={-1} aria-hidden="true" /><i className="fa-solid fa-location-dot" aria-hidden="true" /><span>Open in Google Maps</span></a>
        <section id="event-location" className="bargain-sale-about-card"><h2>About this sale</h2><p>{sale.description}</p><ul><li><i className="fa-solid fa-money-bill-wave" aria-hidden="true" /> Cash and card payments welcome</li><li><i className="fa-solid fa-bag-shopping" aria-hidden="true" /> Bring your own bags for larger finds</li></ul></section>
      </aside>
      {galleryIndex !== null ? <BargainSaleItemGallery activeIndex={galleryIndex} items={items} onClose={() => setGalleryIndex(null)} onSelect={setGalleryIndex} /> : null}
      </div>
    </PageContainer>
  </main>;
}
