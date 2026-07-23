"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type EditableListing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  itemCondition: "brand_new" | "like_new" | "good" | "fair";
  tradeMethod: "pickup_delivery" | "pickup" | "delivery";
};

export function EditListingClient({ listing }: { listing: EditableListing }) {
  const router = useRouter();
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [price, setPrice] = useState((listing.priceCents / 100).toFixed(listing.priceCents % 100 ? 2 : 0));
  const [itemCondition, setItemCondition] = useState(listing.itemCondition);
  const [tradeMethod, setTradeMethod] = useState(listing.tradeMethod);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const priceCents = Math.round(Number(price) * 100);
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/market/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priceCents, itemCondition, tradeMethod }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Unable to update this listing right now.");
        return;
      }
      router.push(`/market/${listing.id}`);
      router.refresh();
    } catch {
      setError("Unable to update this listing right now.");
    } finally {
      setIsSaving(false);
    }
  };

  return <main className="listing-edit-page"><Link href={`/market/${listing.id}`} className="listing-detail-back"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to listing</Link><form className="listing-edit-form" onSubmit={save}><header><span>MANAGE LISTING</span><h1>Edit listing</h1><p>Update the details buyers see. Existing photos stay attached.</p></header><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} required /></label><div className="listing-edit-grid"><label>Price (NZD)<input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" required /></label><label>Condition<select value={itemCondition} onChange={(event) => setItemCondition(event.target.value as EditableListing["itemCondition"])}><option value="brand_new">Brand new</option><option value="like_new">Like new</option><option value="good">Good</option><option value="fair">Fair</option></select></label><label>Delivery<select value={tradeMethod} onChange={(event) => setTradeMethod(event.target.value as EditableListing["tradeMethod"])}><option value="pickup_delivery">Pickup or delivery</option><option value="pickup">Pickup</option><option value="delivery">Delivery</option></select></label></div>{error ? <p className="listing-edit-error" role="alert">{error}</p> : null}<footer><Link href={`/market/${listing.id}`}>Cancel</Link><button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</button></footer></form></main>;
}
