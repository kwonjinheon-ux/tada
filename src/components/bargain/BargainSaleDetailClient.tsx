"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BargainSaleItemGallery } from "@/components/bargain/BargainSaleItemGallery";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { formatMarketPrice } from "@/lib/market/format-price";
import { copyCurrentPageLink } from "@/lib/share/copy-page-link";

type PickupStatus = "requested" | "confirmed" | "on_the_way";
type SaleItem = {
  id: string; title: string; description: string; category: string | null; priceCents: number; image: { src: string; alt: string };
  status: "available" | "reserved" | "sold"; pendingReservationIds: string[];
  viewerReservation: { id: string; status: PickupStatus; pickupStartAt: string | null; pickupEndAt: string | null; expiresAt: string | null } | null;
};

export type BargainSaleDetail = {
  id: string; title: string; description: string; type: "moving-sale" | "garage-sale"; location: string; address: string | null;
  dateLabel: string | null; timeLabel: string | null; coverImage: { src: string; alt: string }; seller: { name: string; avatarUrl: string | null };
  viewerIsOwner: boolean; items: SaleItem[];
};

function toDateTimeLocalValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function BargainSaleDetailClient({ sale }: { sale: BargainSaleDetail }) {
  const router = useRouter();
  const [items, setItems] = useState(sale.items);
  const [activeCategory, setActiveCategory] = useState("All items");
  const [searchQuery, setSearchQuery] = useState("");
  const [reserveItemId, setReserveItemId] = useState<string | null>(null);
  const [pickupStart, setPickupStart] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  useEffect(() => setItems(sale.items), [sale.items]);

  const categories = useMemo(() => ["All items", ...Array.from(new Set(items.map((item) => item.category).filter((category): category is string => Boolean(category)))).slice(0, 5)], [items]);
  const visibleItems = items.filter((item) => (activeCategory === "All items" || item.category === activeCategory) && [item.title, item.description, item.category].filter(Boolean).join(" ").toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const selectedReserveItem = reserveItemId ? items.find((item) => item.id === reserveItemId) ?? null : null;
  const mapLocation = sale.address ?? sale.location;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapLocation)}&travelmode=driving`;
  const mapEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapLocation)}&z=15&output=embed`;
  const typeLabel = sale.type === "moving-sale" ? "Moving sale" : "Garage sale";
  const typeHref = sale.type === "moving-sale" ? "/market/moving-sales" : "/market/garage-sales";
  const showActionNotice = (message: string) => { setActionError(null); setActionNotice(message); window.setTimeout(() => setActionNotice(null), 3_500); };
  const pickupLabel = (value: string | null) => value ? new Intl.DateTimeFormat("en-NZ", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "the selected time";

  const shareSale = async () => {
    try { await copyCurrentPageLink(); setIsShareCopied(true); window.setTimeout(() => setIsShareCopied(false), 2_000); }
    catch { setActionError("Unable to copy this listing link. Please try again."); }
  };
  const openReserveDialog = (itemId: string) => {
    const next = new Date();
    next.setMinutes(next.getMinutes() + 60, 0, 0);
    setPickupStart(toDateTimeLocalValue(next));
    setReserveItemId(itemId);
  };
  const reserveItem = async () => {
    if (!selectedReserveItem || !pickupStart || busyId) return;
    setActionError(null); setBusyId(selectedReserveItem.id);
    try {
      const pickupStartAt = new Date(pickupStart);
      const response = await fetch("/api/bargain/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: sale.id, itemId: selectedReserveItem.id, pickupStartAt: pickupStartAt.toISOString(), pickupEndAt: new Date(pickupStartAt.getTime() + 30 * 60 * 1000).toISOString() }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to send your pickup request right now.");
      setReserveItemId(null); showActionNotice("Pickup request sent. The seller will confirm your time."); router.refresh();
    } catch (error) { setActionError(error instanceof Error ? error.message : "Unable to send your pickup request right now."); }
    finally { setBusyId(null); }
  };
  const updatePickup = async (reservationId: string, action: "cancel" | "on_the_way") => {
    setActionError(null); setBusyId(reservationId);
    try {
      const response = await fetch(`/api/bargain/reservations/${reservationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update your pickup.");
      showActionNotice(action === "on_the_way" ? "The seller has been told you are on the way." : "Your pickup commitment has been cancelled."); router.refresh();
    } catch (error) { setActionError(error instanceof Error ? error.message : "Unable to update your pickup."); }
    finally { setBusyId(null); }
  };

  return <main className="bargain-sale-detail-page"><PageContainer>
    <div className="listing-detail-back-row" aria-label="Bargain navigation"><Link className="listing-detail-back" href="/market"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to listings</Link><nav className="listing-detail-category-path" aria-label="Shop type"><Link href="/market">Market</Link><span aria-hidden="true">/</span><Link href={typeHref}>{typeLabel}</Link></nav></div>
    <div className="bargain-sale-detail-layout">
      <section className="bargain-sale-detail-overview"><div className="bargain-sale-detail-hero"><Image src={sale.coverImage.src} alt={sale.coverImage.alt} fill priority unoptimized sizes="(max-width: 1200px) 100vw, 780px" /><div className="bargain-sale-detail-hero-shade" /><div className="bargain-sale-detail-hero-content"><span className="bargain-sale-detail-type">{typeLabel}</span><h1>{sale.title}</h1><p>{sale.description}</p></div></div>
        <div className="bargain-sale-summary-cards"><section className="bargain-sale-event-card"><h2><i className="fa-regular fa-calendar-days" aria-hidden="true" /> Event logistics</h2><dl>{sale.dateLabel ? <div><dt><i className="fa-regular fa-calendar" aria-hidden="true" /><span className="sr-only">Date</span></dt><dd>{sale.dateLabel}</dd></div> : null}{sale.timeLabel ? <div><dt><i className="fa-regular fa-clock" aria-hidden="true" /><span className="sr-only">Time</span></dt><dd>{sale.timeLabel}</dd></div> : null}<div><dt><i className="fa-solid fa-location-dot" aria-hidden="true" /><span className="sr-only">Location</span></dt><dd>{sale.address ?? sale.location}</dd></div></dl>{sale.address ? <a className="bargain-sale-directions" href={directionsHref} target="_blank" rel="noreferrer">Get directions <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a> : <p className="bargain-sale-pickup-privacy"><i className="fa-solid fa-lock" aria-hidden="true" /> Exact pickup location is shared after the seller confirms your visit.</p>}</section>
          <section className="bargain-sale-host-card"><h2><i className="fa-solid fa-user" aria-hidden="true" /> Seller info</h2><div className="bargain-sale-host-profile"><span className="bargain-sale-host-avatar">{sale.seller.avatarUrl ? <Image src={sale.seller.avatarUrl} alt="" fill unoptimized sizes="56px" /> : <span aria-hidden="true">{sale.seller.name.slice(0, 1).toUpperCase()}</span>}</span><div><strong>{sale.seller.name}</strong><span>Local Tada seller</span></div></div><div className="bargain-sale-host-actions"><Button variant="secondary" size="sm" block><i className="fa-regular fa-message" aria-hidden="true" /> Message</Button><Button variant="secondary" size="sm" block onClick={() => void shareSale()}><i className={isShareCopied ? "fa-solid fa-check" : "fa-solid fa-share-nodes"} aria-hidden="true" /> {isShareCopied ? "Copied" : "Share"}</Button></div></section></div>
      </section>
      <section className="bargain-sale-detail-inventory" aria-labelledby="sale-inventory-title"><header><div><h2 id="sale-inventory-title">Sale inventory ({items.length} items)</h2><p>Choose a time to plan a visit. A seller confirmation creates the temporary hold.</p></div><label className="bargain-sale-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><span className="sr-only">Search sale inventory</span><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search inventory..." /></label></header><div className="bargain-sale-category-tabs" aria-label="Filter sale items">{categories.map((category) => <button key={category} type="button" className={activeCategory === category ? "is-selected" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}</div>
        {actionNotice ? <p className="bargain-sale-action-notice" role="status">{actionNotice}</p> : null}{actionError ? <p className="bargain-sale-action-error" role="alert">{actionError}</p> : null}
        {visibleItems.length ? <div className="bargain-sale-detail-items">{visibleItems.map((item, index) => <article className={`bargain-sale-detail-item ${item.status === "sold" ? "is-sold" : ""}`} key={item.id}><button className="bargain-sale-detail-item-image" type="button" onClick={() => setGalleryIndex(items.findIndex((saleItem) => saleItem.id === item.id))} aria-label={`View ${item.title} photo gallery`}><Image src={item.image.src} alt={item.image.alt} fill unoptimized sizes="(max-width: 767px) 100vw, 280px" />{item.status === "sold" ? <span>Sold</span> : <b>{item.status === "reserved" ? "Held for pickup" : "Available"}</b>}</button><div className="bargain-sale-detail-item-copy"><div><h3>{index + 1}. {item.title}</h3><strong>{formatMarketPrice(item.priceCents)}</strong></div><p>{item.description}</p><div className="bargain-sale-item-actions">{sale.viewerIsOwner ? <Link className="ui-button ui-button--primary primary-button ui-button--sm ui-button--block" href={`/market/${sale.id}/items/${item.id}/edit`}>{item.pendingReservationIds.length ? `Review pickup (${item.pendingReservationIds.length})` : "Edit item"}</Link> : item.viewerReservation ? <><span className={`bargain-sale-pickup-status is-${item.viewerReservation.status}`}>{item.viewerReservation.status === "requested" ? "Pickup requested" : item.viewerReservation.status === "on_the_way" ? "On your way" : `Pickup confirmed · ${pickupLabel(item.viewerReservation.pickupStartAt)}`}</span>{item.viewerReservation.status === "confirmed" ? <Button size="sm" block disabled={busyId !== null} onClick={() => void updatePickup(item.viewerReservation!.id, "on_the_way")}>I&apos;m on my way</Button> : null}<Button variant="secondary" size="sm" block disabled={busyId !== null} onClick={() => void updatePickup(item.viewerReservation!.id, "cancel")}>Cancel pickup</Button></> : <Button size="sm" block disabled={item.status !== "available" || busyId === item.id} onClick={() => openReserveDialog(item.id)}>{busyId === item.id ? "Sending…" : item.status === "reserved" ? "Held for pickup" : "Plan a visit"}</Button>}</div></div></article>)}</div> : <div className="bargain-sale-detail-empty" role="status"><i className="fa-solid fa-box-open" aria-hidden="true" /><strong>No items in this category</strong><span>Choose another category to see the sale inventory.</span></div>}
      </section>
      <aside className="bargain-sale-detail-sidebar"><a className="bargain-sale-map-card" href={directionsHref} target="_blank" rel="noreferrer" aria-label={`Get directions to ${mapLocation}`}><iframe className="bargain-sale-map-embed" src={mapEmbedSrc} title={`Map of ${mapLocation}`} loading="lazy" tabIndex={-1} aria-hidden="true" /><i className="fa-solid fa-location-dot" aria-hidden="true" /><span>Open in Google Maps</span></a><section id="event-location" className="bargain-sale-about-card"><h2>About this sale</h2><p>{sale.description}</p><ul><li><i className="fa-solid fa-money-bill-wave" aria-hidden="true" /> Cash and card payments welcome</li><li><i className="fa-solid fa-bag-shopping" aria-hidden="true" /> Bring your own bags for larger finds</li></ul></section></aside>
      {galleryIndex !== null ? <BargainSaleItemGallery activeIndex={galleryIndex} items={items} onClose={() => setGalleryIndex(null)} onSelect={setGalleryIndex} /> : null}
      {selectedReserveItem ? <DialogOverlay className="bargain-pickup-dialog-backdrop" aria-labelledby="bargain-pickup-dialog-title" onClose={() => setReserveItemId(null)} isDismissible={busyId === null} dismissHint="Click outside to cancel your pickup request"><section className="bargain-pickup-dialog"><div className="bargain-pickup-dialog-icon"><i className="fa-regular fa-calendar-check" aria-hidden="true" /></div><h2 id="bargain-pickup-dialog-title">Plan a visit</h2><p>Request a 30-minute pickup for <strong>{selectedReserveItem.title}</strong>. This is a visit request, not a completed purchase. The seller must confirm it.</p><label><span>Pickup time</span><input type="datetime-local" value={pickupStart} min={toDateTimeLocalValue(new Date())} step="1800" onChange={(event) => setPickupStart(event.target.value)} required /></label><p className="bargain-pickup-dialog-note"><i className="fa-solid fa-lock" aria-hidden="true" /> The exact address is shared only after confirmation.</p><div><Button variant="secondary" onClick={() => setReserveItemId(null)} disabled={busyId !== null}>Cancel</Button><Button onClick={() => void reserveItem()} disabled={!pickupStart || busyId !== null}>{busyId ? "Sending…" : "Request pickup"}</Button></div></section></DialogOverlay> : null}
    </div>
  </PageContainer></main>;
}
