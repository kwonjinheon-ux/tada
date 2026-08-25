"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ManageListingActions({ id, title, status }: { id: string; title: string; status: "published" | "pending" | "sold" | "archived" }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRelisting, setIsRelisting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const canEdit = status === "published" || status === "archived";
  const canDelete = status === "published" || status === "archived";
  const canRelist = status === "published";

  const relistListing = async () => {
    setIsRelisting(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/market/listings/${id}`, { method: "POST" });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to relist item");
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to relist item right now.");
    } finally {
      setIsRelisting(false);
    }
  };

  const deleteListing = async () => {
    if (!window.confirm(`Delete \"${title}\"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/market/listings/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete listing");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === "pending") return <div className="listing-row-actions manage-listing-actions"><Link href="/market/dashboard/messages"><i className="ti ti-message" /> View trade</Link><button type="button" disabled>Editing locked</button></div>;
  if (status === "sold") return <div className="listing-row-actions manage-listing-actions"><button type="button" disabled><i className="ti ti-circle-check" /> Sold</button><button type="button" disabled>Sale complete</button></div>;

  return <div className="listing-row-actions manage-listing-actions">
    {canRelist ? <button className="manage-listing-relist" type="button" onClick={() => void relistListing()} disabled={isRelisting}><i className="ti ti-arrow-up" /> {isRelisting ? "Relisting..." : "Relist"}</button> : null}
    {canEdit ? <Link href={`/market/${id}/edit`}><i className="ti ti-pencil" /> Edit</Link> : null}
    <button type="button" onClick={() => void deleteListing()} disabled={!canDelete || isDeleting}><i className="ti ti-trash" /> {isDeleting ? "Deleting..." : "Delete"}</button>
    {actionError ? <p className="manage-listing-action-error" role="alert">{actionError}</p> : null}
  </div>;
}
