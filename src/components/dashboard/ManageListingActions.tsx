"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ManageListingActions({ id, title, status }: { id: string; title: string; status: "published" | "pending" | "sold" | "archived" }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const canEdit = status === "published" || status === "archived";
  const canDelete = status === "published" || status === "archived";

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

  if (status === "pending") return <div className="manage-listing-actions"><Link href="/market/dashboard/messages"><i className="fa-regular fa-message" /> View trade</Link><button type="button" disabled>Editing locked</button></div>;
  if (status === "sold") return <div className="manage-listing-actions"><button type="button" disabled><i className="fa-solid fa-circle-check" /> Sold</button><button type="button" disabled>Sale complete</button></div>;

  return <div className="manage-listing-actions">
    {canEdit ? <Link href={`/market/${id}/edit`}><i className="fa-solid fa-pen" /> Edit</Link> : null}
    <button type="button" onClick={() => void deleteListing()} disabled={!canDelete || isDeleting}><i className="fa-regular fa-trash-can" /> {isDeleting ? "Deleting..." : "Delete"}</button>
  </div>;
}
