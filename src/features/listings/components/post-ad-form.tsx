"use client";

import { FormEvent } from "react";
import { useListingForm } from "@/features/listings/hooks/use-listing-form";

const mainCategories = ["Electronics", "Home & Furniture", "Clothing", "Entertainment"];
const subCategories = ["Computers", "Smartphones", "Audio", "Cameras"];
const regions = ["Auckland", "Wellington", "Canterbury"];

export function PostAdForm() {
  const { draft, error, update, validate } = useListingForm();
  const submit = (event: FormEvent) => { event.preventDefault(); if (validate()) alert("Draft validated. Connect this ViewModel to a protected server action next."); };
  return <section style={{ border: "1px solid var(--color-line)", borderRadius: "var(--radius-card)", padding: "clamp(20px, 4vw, 44px)", background: "var(--color-surface)", boxShadow: "var(--shadow-card)" }}>
    <form onSubmit={submit} style={{ display: "grid", gap: 20 }}>
      <Field label="Listing title"><input value={draft.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. iPhone 15 Pro Max - 256GB Titanium" /><small>Your category will be automatically suggested based on the listing title.</small></Field>
      <div className="form-grid"><Select label="Main category" value={draft.mainCategory} onChange={(value) => update("mainCategory", value)} placeholder="Select main category" options={mainCategories} /><Select label="Sub category" value={draft.subCategory} onChange={(value) => update("subCategory", value)} placeholder="Select sub category" options={subCategories} /><Select label="Trade method" value={draft.tradeMethod} onChange={(value) => update("tradeMethod", value as typeof draft.tradeMethod)} options={["pickup_delivery", "pickup", "delivery"]} labels={["Pickup & delivery", "Pickup only", "Delivery only"]} /><Select label="Item condition" value={draft.condition} onChange={(value) => update("condition", value as typeof draft.condition)} options={["brand_new", "like_new", "good", "fair"]} labels={["Brand new", "Like new", "Good", "Fair"]} /></div>
      <Field label="Description"><textarea value={draft.description} onChange={(e) => update("description", e.target.value)} placeholder="Tell buyers about your item's condition, features, and why you're selling..." rows={6} /></Field>
      <Field label="Price (NZD)"><input inputMode="decimal" value={draft.priceCents || ""} onChange={(e) => update("priceCents", Number(e.target.value))} placeholder="$ 0.00" /></Field>
      <div className="form-grid form-grid-three"><Select label="Region" value={draft.region} onChange={(value) => update("region", value)} placeholder="Select region" options={regions} /><Select label="Area" value={draft.area} onChange={(value) => update("area", value)} placeholder="Select area" options={["CBD", "North Shore", "Mount Eden", "Newmarket"]} /><Select label="Meeting place" value={draft.meetingPlace} onChange={(value) => update("meetingPlace", value)} placeholder="Select a safe meeting place" options={["Public location", "Pickup from home"]} /></div>
      {error && <p role="alert" style={{ color: "#b42318", margin: 0 }}>{error}</p>}<button className="button button-primary" type="submit">Post now</button>
    </form>
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="form-field"><span>{label}</span>{children}</label>; }
function Select({ label, value, onChange, options, labels, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: string[]; placeholder?: string }) { return <Field label={label}><select value={value} onChange={(e) => onChange(e.target.value)}><option value="">{placeholder ?? "Select"}</option>{options.map((option, index) => <option key={option} value={option}>{labels?.[index] ?? option}</option>)}</select></Field>; }
