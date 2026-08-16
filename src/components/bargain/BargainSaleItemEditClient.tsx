"use client";

import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageInner } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isAcceptedMarketListingImage, normalizeMarketListingImage } from "@/lib/media/market-listing-image";

type PendingOffer = { id: string; amountCents: number };

export function BargainSaleItemEditClient({ listingId, item, offers }: { listingId: string; item: { id: string; title: string; description: string; priceCents: number; imageUrl: string; storagePath: string | null }; offers: PendingOffer[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState((item.priceCents / 100).toFixed(2));
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(item.imageUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isResponding, setIsResponding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isAcceptedMarketListingImage(file)) { setError("Use a JPG, PNG, or WebP image up to 5MB."); return; }
    try {
      const normalized = await normalizeMarketListingImage(file);
      setPhoto(normalized);
      setPreviewUrl(URL.createObjectURL(normalized));
      setError(null);
    } catch { setError("Unable to prepare this image."); }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const priceCents = Math.round(Number(price) * 100);
    if (!title.trim() || !description.trim() || !Number.isInteger(priceCents) || priceCents < 0) { setError("Enter a title, description, and valid price."); return; }
    setError(null); setIsSaving(true);
    try {
      let photoPayload: Record<string, unknown> = {};
      if (photo) {
        const supabase = createBrowserSupabaseClient();
        if (!supabase) throw new Error("Photo uploads are unavailable right now.");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Please log in again before saving.");
        const storagePath = `${user.id}/${listingId}/${crypto.randomUUID()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage.from("bargain-listing-images").upload(storagePath, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw new Error(uploadError.message);
        photoPayload = { photoPath: storagePath, originalName: photo.name, mimeType: photo.type, sizeBytes: photo.size };
      }
      const response = await fetch(`/api/bargain/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, title: title.trim(), description: description.trim(), priceCents, ...photoPayload }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save this item.");
      router.push(`/market/${listingId}`); router.refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save this item."); } finally { setIsSaving(false); }
  };
  const respondToOffer = async (reservationId: string, action: "accept" | "decline") => {
    setError(null); setIsResponding(reservationId);
    try {
      const response = await fetch(`/api/bargain/reservations/${reservationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update this offer.");
      router.push(`/market/${listingId}`); router.refresh();
    } catch (responseError) { setError(responseError instanceof Error ? responseError.message : "Unable to update this offer."); } finally { setIsResponding(null); }
  };

  return <main className="bargain-item-edit-page"><PageContainer><PageInner size="form"><Link className="listing-detail-back" href={`/market/${listingId}`}><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to sale</Link><section className="ui-card bargain-item-edit-card"><h1>Edit item</h1><form onSubmit={save}><label>Photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choosePhoto(event)} /></label><div className="bargain-item-edit-preview"><Image src={previewUrl} alt="Item preview" fill unoptimized sizes="(max-width: 767px) 100vw, 480px" /></div><label>Item title<input className="ui-input" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Price (NZD)<input className="ui-input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>Description<textarea className="ui-input" value={description} onChange={(event) => setDescription(event.target.value)} /></label>{error ? <p className="bargain-sale-action-error" role="alert">{error}</p> : null}<div className="bargain-item-edit-actions"><Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save item"}</Button><Button variant="secondary" onClick={() => router.push(`/market/${listingId}`)}>Cancel</Button></div></form></section>{offers.length ? <section className="ui-card bargain-item-offers"><h2>Pending offers</h2><p>Accepting an offer marks this item as sold and disables further offers.</p>{offers.map((offer) => <div key={offer.id}><strong>${(offer.amountCents / 100).toFixed(2)}</strong><span><Button size="sm" onClick={() => void respondToOffer(offer.id, "accept")} disabled={isResponding !== null}>{isResponding === offer.id ? "Saving…" : "Accept offer"}</Button><Button variant="secondary" size="sm" onClick={() => void respondToOffer(offer.id, "decline")} disabled={isResponding !== null}>Decline</Button></span></div>)}</section> : null}</PageInner></PageContainer></main>;
}
