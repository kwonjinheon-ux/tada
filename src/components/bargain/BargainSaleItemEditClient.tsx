"use client";

import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageInner } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";
import { pickupErrorKey } from "@/lib/bargain/pickup-error";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isAcceptedMarketListingImage, normalizeMarketListingImage } from "@/lib/media/market-listing-image";

type PickupRequest = { id: string; amountCents: number; status: "requested" | "confirmed" | "on_the_way"; pickupStartAt: string | null; pickupEndAt: string | null };

export function BargainSaleItemEditClient({ listingId, item, pickupRequests }: { listingId: string; item: { id: string; title: string; description: string; priceCents: number; imageUrl: string; storagePath: string | null }; pickupRequests: PickupRequest[] }) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState((item.priceCents / 100).toFixed(2));
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(item.imageUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isResponding, setIsResponding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const itemSaveErrorKey = (status: number): TranslationKey => status === 401 ? "bargainItemLoginRequired" : status === 400 ? "bargainItemValidation" : status === 403 ? "bargainItemNotSeller" : status === 404 ? "bargainItemMissing" : "bargainItemSaveFailed";

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isAcceptedMarketListingImage(file)) { setError(t("bargainImageTypeHint")); return; }
    try {
      const normalized = await normalizeMarketListingImage(file);
      setPhoto(normalized);
      setPreviewUrl(URL.createObjectURL(normalized));
      setError(null);
    } catch { setError(t("bargainImagePrepFailed")); }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const priceCents = Math.round(Number(price) * 100);
    if (!title.trim() || !description.trim() || !Number.isInteger(priceCents) || priceCents < 0) { setError(t("bargainItemValidation")); return; }
    setError(null); setIsSaving(true);
    try {
      let photoPayload: Record<string, unknown> = {};
      if (photo) {
        const supabase = createBrowserSupabaseClient();
        if (!supabase) throw new Error(t("bargainPhotoUnavailable"));
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error(t("bargainLoginBeforeSaving"));
        const storagePath = `${user.id}/${listingId}/${crypto.randomUUID()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage.from("bargain-listing-images").upload(storagePath, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw new Error(uploadError.message);
        photoPayload = { photoPath: storagePath, originalName: photo.name, mimeType: photo.type, sizeBytes: photo.size };
      }
      const response = await fetch(`/api/bargain/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, title: title.trim(), description: description.trim(), priceCents, ...photoPayload }) });
      if (!response.ok) throw new Error(t(itemSaveErrorKey(response.status)));
      router.push(`/market/${listingId}`); router.refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : t("bargainItemSaveFailed")); } finally { setIsSaving(false); }
  };
  const respondToOffer = async (reservationId: string, action: "accept" | "decline" | "picked_up" | "no_show") => {
    setError(null); setIsResponding(reservationId);
    try {
      const response = await fetch(`/api/bargain/reservations/${reservationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (!response.ok) throw new Error(t(pickupErrorKey(response.status)));
      router.push(`/market/${listingId}`); router.refresh();
    } catch (responseError) { setError(responseError instanceof Error ? responseError.message : t("bargainOfferUpdateFailed")); } finally { setIsResponding(null); }
  };

  const pickupTime = (value: string | null) => value ? new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-NZ", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : t("bargainNoTimeSelected");
  return <main className="bargain-item-edit-page"><PageContainer><PageInner size="form"><Link className="listing-detail-back" href={`/market/${listingId}`}><i className="fa-solid fa-arrow-left" aria-hidden="true" /> {t("bargainBackToSale")}</Link><section className="ui-card bargain-item-edit-card"><h1>{t("bargainEditItem")}</h1><form onSubmit={save}><label>{t("bargainPhoto")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choosePhoto(event)} /></label><div className="bargain-item-edit-preview"><Image src={previewUrl} alt={t("bargainItemPreview")} fill unoptimized sizes="(max-width: 767px) 100vw, 480px" /></div><label>{t("bargainItemTitle")}<input className="ui-input" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>{t("bargainPriceNzd")}<input className="ui-input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>{t("bargainDescription")}<textarea className="ui-input" value={description} onChange={(event) => setDescription(event.target.value)} /></label>{error ? <p className="bargain-sale-action-error" role="alert">{error}</p> : null}<div className="bargain-item-edit-actions"><Button type="submit" disabled={isSaving}>{isSaving ? t("saving") : t("bargainSaveItem")}</Button><Button variant="secondary" onClick={() => router.push(`/market/${listingId}`)}>{t("cancel")}</Button></div></form></section>{pickupRequests.length ? <section className="ui-card bargain-item-offers"><h2>{t("bargainPickupCommitments")}</h2><p>{t("bargainPickupCommitmentsHint")}</p>{pickupRequests.map((request) => <div key={request.id}><span><strong>${(request.amountCents / 100).toFixed(2)}</strong><small>{request.status === "requested" ? `${t("bargainRequestedFor")} ${pickupTime(request.pickupStartAt)}` : request.status === "on_the_way" ? t("bargainBuyerOnTheWay") : `${t("bargainConfirmedFor")} ${pickupTime(request.pickupStartAt)}`}</small></span><span>{request.status === "requested" ? <><Button size="sm" onClick={() => void respondToOffer(request.id, "accept")} disabled={isResponding !== null}>{isResponding === request.id ? t("saving") : t("bargainConfirmPickup")}</Button><Button variant="secondary" size="sm" onClick={() => void respondToOffer(request.id, "decline")} disabled={isResponding !== null}>{t("bargainDecline")}</Button></> : <><Button size="sm" onClick={() => void respondToOffer(request.id, "picked_up")} disabled={isResponding !== null}>{isResponding === request.id ? t("saving") : t("bargainMarkPickedUp")}</Button><Button variant="secondary" size="sm" onClick={() => void respondToOffer(request.id, "no_show")} disabled={isResponding !== null}>{t("bargainNoShow")}</Button></>}</span></div>)}</section> : null}</PageInner></PageContainer></main>;
}
