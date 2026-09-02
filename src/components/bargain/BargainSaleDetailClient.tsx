"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BargainSaleItemGallery } from "@/components/bargain/BargainSaleItemGallery";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { useLanguage } from "@/components/LanguageProvider";
import { pickupErrorKey } from "@/lib/bargain/pickup-error";
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
  const { t, locale } = useLanguage();
  const [items, setItems] = useState(sale.items);
  const [activeCategory, setActiveCategory] = useState("All items");
  const [searchQuery, setSearchQuery] = useState("");
  const [reserveItemId, setReserveItemId] = useState<string | null>(null);
  const [pickupStart, setPickupStart] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  useEffect(() => setItems(sale.items), [sale.items]);

  const categories = useMemo(() => ["All items", ...Array.from(new Set(items.map((item) => item.category).filter((category): category is string => Boolean(category)))).slice(0, 5)], [items]);
  const visibleItems = items.filter((item) => (activeCategory === "All items" || item.category === activeCategory) && [item.title, item.description, item.category].filter(Boolean).join(" ").toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const selectedReserveItem = reserveItemId ? items.find((item) => item.id === reserveItemId) ?? null : null;
  const mapLocation = sale.address ?? sale.location;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapLocation)}&travelmode=driving`;
  const mapEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapLocation)}&z=15&output=embed`;
  const typeLabel = sale.type === "moving-sale" ? t("shopTypeMovingSale") : t("shopTypeGarageSale");
  const typeHref = sale.type === "moving-sale" ? "/market/moving-sales" : "/market/garage-sales";
  // Outcomes surface in a popup. The old inline notice rendered behind the open
  // pickup dialog, so a rejected request looked like nothing had happened.
  const showActionNotice = (message: string) => setActionFeedback({ tone: "success", message });
  const showActionError = (message: string) => setActionFeedback({ tone: "error", message });
  const pickupErrorMessage = (status: number) => t(pickupErrorKey(status));
  const pickupLabel = (value: string | null) => value ? new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-NZ", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : t("bargainSelectedTime");

  const shareSale = async () => {
    try { await copyCurrentPageLink(); setIsShareCopied(true); window.setTimeout(() => setIsShareCopied(false), 2_000); }
    catch { showActionError(t("bargainShareFailed")); }
  };
  const openReserveDialog = (itemId: string) => {
    const next = new Date();
    next.setMinutes(next.getMinutes() + 60, 0, 0);
    setPickupStart(toDateTimeLocalValue(next));
    setReserveItemId(itemId);
  };
  const reserveItem = async () => {
    if (!selectedReserveItem || !pickupStart || busyId) return;
    setReserveError(null); setBusyId(selectedReserveItem.id);
    try {
      const pickupStartAt = new Date(pickupStart);
      const response = await fetch("/api/bargain/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: sale.id, itemId: selectedReserveItem.id, pickupStartAt: pickupStartAt.toISOString(), pickupEndAt: new Date(pickupStartAt.getTime() + 30 * 60 * 1000).toISOString() }) });
      if (!response.ok) throw new Error(pickupErrorMessage(response.status));
      setReserveItemId(null); showActionNotice(t("bargainPickupRequestSent")); router.refresh();
    } catch (error) { setReserveError(error instanceof Error ? error.message : t("bargainPickupFailed")); }
    finally { setBusyId(null); }
  };
  const updatePickup = async (reservationId: string, action: "cancel" | "on_the_way") => {
    setActionFeedback(null); setBusyId(reservationId);
    try {
      const response = await fetch(`/api/bargain/reservations/${reservationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (!response.ok) throw new Error(pickupErrorMessage(response.status));
      showActionNotice(action === "on_the_way" ? t("bargainOnTheWayNotice") : t("bargainPickupCancelledNotice")); router.refresh();
    } catch (error) { showActionError(error instanceof Error ? error.message : t("bargainPickupUpdateFailed")); }
    finally { setBusyId(null); }
  };

  return <main className="market-theme bargain-sale-detail-page"><PageContainer>
    <div className="listing-detail-back-row" aria-label={t("bargainNavigation")}><Link className="listing-detail-back" href="/market"><i className="ms ms-arrow-back" aria-hidden="true" /> {t("bargainBackToListings")}</Link><nav className="listing-detail-category-path" aria-label={t("marketType")}><Link href="/market">{t("market")}</Link><span aria-hidden="true">/</span><Link href={typeHref}>{typeLabel}</Link></nav></div>
    <div className="bargain-sale-detail-layout">
      <section className="bargain-sale-detail-overview"><div className="bargain-sale-detail-hero"><Image src={sale.coverImage.src} alt={sale.coverImage.alt} fill priority unoptimized sizes="(max-width: 1200px) 100vw, 780px" /><div className="bargain-sale-detail-hero-shade" /><div className="bargain-sale-detail-hero-content"><span className="bargain-sale-detail-type">{typeLabel}</span><h1>{sale.title}</h1><p>{sale.description}</p></div></div>
        <div className="bargain-sale-summary-cards"><section className="bargain-sale-event-card"><h2><i className="ms ms-calendar-month" aria-hidden="true" /> {t("bargainEventLogistics")}</h2><dl>{sale.dateLabel ? <div><dt><i className="ms ms-calendar-today" aria-hidden="true" /><span className="sr-only">{t("bargainDate")}</span></dt><dd>{sale.dateLabel}</dd></div> : null}{sale.timeLabel ? <div><dt><i className="ms ms-schedule" aria-hidden="true" /><span className="sr-only">{t("bargainTime")}</span></dt><dd>{sale.timeLabel}</dd></div> : null}<div><dt><i className="ms ms-location-on" aria-hidden="true" /><span className="sr-only">{t("location")}</span></dt><dd>{sale.address ?? sale.location}</dd></div></dl>{sale.address ? <a className="bargain-sale-directions" href={directionsHref} target="_blank" rel="noreferrer">{t("bargainGetDirections")} <i className="ms ms-open-in-new" aria-hidden="true" /></a> : <p className="bargain-sale-pickup-privacy"><i className="ms ms-lock" aria-hidden="true" /> {t("bargainPickupLocationPrivacy")}</p>}</section>
          <section className="bargain-sale-host-card"><h2><i className="ms ms-person" aria-hidden="true" /> {t("bargainSellerInfo")}</h2><div className="bargain-sale-host-profile"><span className="bargain-sale-host-avatar">{sale.seller.avatarUrl ? <Image src={sale.seller.avatarUrl} alt="" fill unoptimized sizes="56px" /> : <span aria-hidden="true">{sale.seller.name.slice(0, 1).toUpperCase()}</span>}</span><div><strong>{sale.seller.name}</strong><span>{t("bargainLocalSeller")}</span></div></div><div className="bargain-sale-host-actions"><Button variant="secondary" size="sm" block><i className="ms ms-chat" aria-hidden="true" /> {t("bargainMessageSeller")}</Button><Button variant="secondary" size="sm" block onClick={() => void shareSale()}><i className={isShareCopied ? "ms ms-check" : "ms ms-share"} aria-hidden="true" /> {isShareCopied ? t("communityCopied") : t("communityShare")}</Button></div></section></div>
      </section>
      <section className="bargain-sale-detail-inventory" aria-labelledby="sale-inventory-title"><header><div><h2 id="sale-inventory-title">{t("bargainSaleInventory")} ({items.length} {t("bargainItemCountSuffix")})</h2><p>{t("bargainInventoryHint")}</p></div><label className="bargain-sale-search"><i className="ms ms-search" aria-hidden="true" /><span className="sr-only">{t("bargainSearchInventoryLabel")}</span><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t("bargainSearchInventoryPlaceholder")} /></label></header><div className="bargain-sale-category-tabs" aria-label={t("bargainFilterItems")}>{categories.map((category) => <button key={category} type="button" className={activeCategory === category ? "is-selected" : ""} onClick={() => setActiveCategory(category)}>{category === "All items" ? t("bargainAllItems") : category}</button>)}</div>
        {visibleItems.length ? <div className="bargain-sale-detail-items">{visibleItems.map((item, index) => <article className={`bargain-sale-detail-item ${item.status === "sold" ? "is-sold" : ""}`} key={item.id}><button className="bargain-sale-detail-item-image" type="button" onClick={() => setGalleryIndex(items.findIndex((saleItem) => saleItem.id === item.id))} aria-label={`${item.title} — ${t("bargainPhotoGallery")}`}><Image src={item.image.src} alt={item.image.alt} fill unoptimized sizes="(max-width: 767px) 100vw, 280px" />{item.status === "sold" ? <span>{t("bargainSold")}</span> : <b>{item.status === "reserved" ? t("bargainHeldForPickup") : t("available")}</b>}</button><div className="bargain-sale-detail-item-copy"><div><h3>{index + 1}. {item.title}</h3><strong>{formatMarketPrice(item.priceCents)}</strong></div><p>{item.description}</p><div className="bargain-sale-item-actions">{sale.viewerIsOwner ? <Link className="ui-button ui-button--primary primary-button ui-button--sm ui-button--block" href={`/market/${sale.id}/items/${item.id}/edit`}>{item.pendingReservationIds.length ? `${t("bargainReviewPickup")} (${item.pendingReservationIds.length})` : t("bargainEditItem")}</Link> : item.viewerReservation ? <><span className={`bargain-sale-pickup-status is-${item.viewerReservation.status}`}>{item.viewerReservation.status === "requested" ? t("bargainPickupRequestedStatus") : item.viewerReservation.status === "on_the_way" ? t("bargainOnYourWay") : `${t("bargainPickupConfirmed")} · ${pickupLabel(item.viewerReservation.pickupStartAt)}`}</span>{item.viewerReservation.status === "confirmed" ? <Button size="sm" block disabled={busyId !== null} onClick={() => void updatePickup(item.viewerReservation!.id, "on_the_way")}>{t("bargainImOnMyWay")}</Button> : null}<Button variant="secondary" size="sm" block disabled={busyId !== null} onClick={() => void updatePickup(item.viewerReservation!.id, "cancel")}>{t("bargainCancelPickup")}</Button></> : <Button size="sm" block disabled={item.status !== "available" || busyId === item.id} onClick={() => openReserveDialog(item.id)}>{busyId === item.id ? t("bargainSending") : item.status === "reserved" ? t("bargainHeldForPickup") : t("bargainPlanVisit")}</Button>}</div></div></article>)}</div> : <div className="bargain-sale-detail-empty" role="status"><i className="ms ms-inventory-2" aria-hidden="true" /><strong>{t("bargainNoItemsInCategory")}</strong><span>{t("bargainChooseAnotherCategory")}</span></div>}
      </section>
      <aside className="bargain-sale-detail-sidebar"><a className="bargain-sale-map-card" href={directionsHref} target="_blank" rel="noreferrer" aria-label={`${t("bargainGetDirections")}: ${mapLocation}`}><iframe className="bargain-sale-map-embed" src={mapEmbedSrc} title={`${t("bargainMapLabel")}: ${mapLocation}`} loading="lazy" tabIndex={-1} aria-hidden="true" /><i className="ms ms-location-on" aria-hidden="true" /><span>{t("bargainOpenInGoogleMaps")}</span></a><section id="event-location" className="bargain-sale-about-card"><h2>{t("bargainAboutSale")}</h2><p>{sale.description}</p><ul><li><i className="ms ms-payments" aria-hidden="true" /> {t("bargainPaymentNote")}</li><li><i className="ms ms-shopping-bag" aria-hidden="true" /> {t("bargainBagsNote")}</li></ul></section></aside>
      {galleryIndex !== null ? <BargainSaleItemGallery activeIndex={galleryIndex} items={items} onClose={() => setGalleryIndex(null)} onSelect={setGalleryIndex} /> : null}
      {selectedReserveItem ? <DialogOverlay className="bargain-pickup-dialog-backdrop" aria-labelledby="bargain-pickup-dialog-title" onClose={() => { setReserveItemId(null); setReserveError(null); }} isDismissible={busyId === null}><section className="bargain-pickup-dialog"><div className="bargain-pickup-dialog-icon"><i className="ms ms-event-available" aria-hidden="true" /></div><h2 id="bargain-pickup-dialog-title">{t("bargainPlanVisit")}</h2><p><strong>{selectedReserveItem.title}</strong></p><p>{t("bargainPlanVisitIntro")}</p><label><span>{t("bargainPickupTime")}</span><input type="datetime-local" value={pickupStart} min={toDateTimeLocalValue(new Date())} step="1800" onChange={(event) => setPickupStart(event.target.value)} required /></label><p className="bargain-pickup-dialog-note"><i className="ms ms-lock" aria-hidden="true" /> {t("bargainPickupPrivacyNote")}</p>{reserveError ? <p className="bargain-pickup-dialog-error" role="alert"><i className="ms ms-error" aria-hidden="true" /> {reserveError}</p> : null}<div><Button variant="secondary" onClick={() => { setReserveItemId(null); setReserveError(null); }} disabled={busyId !== null}>{t("cancel")}</Button><Button onClick={() => void reserveItem()} disabled={!pickupStart || busyId !== null}>{busyId ? t("bargainSending") : t("bargainRequestPickup")}</Button></div></section></DialogOverlay> : null}
      {actionFeedback ? <DialogOverlay className="bargain-pickup-dialog-backdrop" aria-labelledby="bargain-pickup-result-title" onClose={() => setActionFeedback(null)}><section className={`bargain-pickup-dialog bargain-pickup-result is-${actionFeedback.tone}`}><div className="bargain-pickup-dialog-icon"><i className={actionFeedback.tone === "success" ? "ms ms-check-circle" : "ms ms-error"} aria-hidden="true" /></div><h2 id="bargain-pickup-result-title">{actionFeedback.tone === "success" ? t("bargainNoticeTitle") : t("bargainErrorTitle")}</h2><p>{actionFeedback.message}</p><div><Button onClick={() => setActionFeedback(null)}>{t("confirmOk")}</Button></div></section></DialogOverlay> : null}
    </div>
  </PageContainer></main>;
}
