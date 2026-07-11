"use client";

import { useState } from "react";
import { listingSchema, type ListingDraft } from "@/features/listings/schemas/listing-schema";

const initialDraft: ListingDraft = { title: "", mainCategory: "", subCategory: "", tradeMethod: "pickup_delivery", condition: "like_new", priceCents: 0, region: "", area: "", meetingPlace: "", description: "" };

export function useListingForm() {
  const [draft, setDraft] = useState<ListingDraft>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const update = <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const validate = () => { const result = listingSchema.safeParse(draft); setError(result.success ? null : result.error.issues[0]?.message ?? "Check the form."); return result.success; };
  return { draft, error, update, validate };
}
