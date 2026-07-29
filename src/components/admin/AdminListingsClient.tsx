"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Listing = { id: string; title: string; owner_id: string; price_cents: number; status: "published" | "pending" | "sold" | "archived"; created_at: string; region_city: string | null; region_suburb: string | null };
const statuses = ["published", "pending", "sold", "archived"] as const;

export function AdminListingsClient() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  useEffect(() => {
    void fetch("/api/admin/listings").then(async (response) => {
      const payload = await response.json().catch(() => null) as { data?: { listings?: Listing[] }; error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to load listings.");
      setListings(payload?.data?.listings ?? []);
    }).catch((loadError: Error) => setError(loadError.message));
  }, []);

  const changeStatus = async (listing: Listing, status: Listing["status"]) => {
    setBusyId(listing.id); setError(null);
    try {
      const response = await fetch(`/api/admin/listings/${listing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to update listing.");
      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status } : item));
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Unable to update listing."); }
    finally { setBusyId(null); }
  };
  const remove = async (listing: Listing) => {
    if (!window.confirm(`Permanently delete “${listing.title}”?`)) return;
    setBusyId(listing.id); setError(null);
    try {
      const response = await fetch(`/api/admin/listings/${listing.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to delete listing.");
      setListings((current) => current.filter((item) => item.id !== listing.id));
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete listing."); }
    finally { setBusyId(null); }
  };

  return <section className="admin-listings-panel">
    <header><p>Marketplace operations</p><h1>All listings</h1><span>Manage published, pending, sold and archived listings across the marketplace.</span></header>
    {error ? <p className="moderation-error" role="alert">{error}</p> : null}
    <div className="admin-listing-table" role="table"><div className="admin-listing-row admin-listing-head" role="row"><span>Listing</span><span>Location</span><span>Status</span><span>Actions</span></div>{listings.map((listing) => <div className="admin-listing-row" role="row" key={listing.id}>
      <span><Link href={`/market/${listing.id}`}>{listing.title}</Link><small>${(listing.price_cents / 100).toLocaleString("en-NZ")}</small></span>
      <span>{[listing.region_suburb, listing.region_city].filter(Boolean).join(", ") || "—"}</span>
      <span><select aria-label={`Status for ${listing.title}`} disabled={busyId === listing.id} value={listing.status} onChange={(event) => void changeStatus(listing, event.target.value as Listing["status"])}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></span>
      <span><button type="button" disabled={busyId === listing.id} onClick={() => void remove(listing)}>Delete</button></span>
    </div>)}</div>
    {!error && !listings.length ? <p className="moderation-empty">No listings found.</p> : null}
  </section>;
}
