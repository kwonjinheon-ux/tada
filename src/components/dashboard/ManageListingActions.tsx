"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export function ManageListingActions({ id, title, status, variant = "current" }: { id: string; title: string; status: "published" | "pending" | "sold" | "archived"; variant?: "current" | "v0" }) {
  const { locale } = useLanguage();
  const ko = locale === "ko" && variant !== "v0";
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

  if (status === "pending") return <div className="listing-row-actions manage-listing-actions"><Link href="/market/dashboard/messages"><i className="ms ms-chat" /> {ko ? "대화 보기" : "View trade"}</Link><button type="button" disabled>{ko ? "수정 대기" : "Editing locked"}</button></div>;
  if (status === "sold") return <div className="listing-row-actions manage-listing-actions"><button type="button" disabled><i className="ms ms-check-circle" /> {ko ? "판매 완료" : "Sold"}</button><button type="button" disabled>{ko ? "거래 완료" : "Sale complete"}</button></div>;

  return <div className="listing-row-actions manage-listing-actions">
    {variant !== "v0" ? <Link href={`/market/${id}`}><i className="ms ms-visibility" aria-hidden="true" /> {ko ? "상품 보기" : "View listing"}</Link> : null}
    {canRelist ? <button className="manage-listing-relist" type="button" onClick={() => void relistListing()} disabled={isRelisting}><i className="ms ms-arrow-upward" /> {isRelisting ? ko ? "다시 등록 중…" : "Relisting..." : ko ? "다시 올리기" : "Relist"}</button> : null}
    {canEdit ? <Link href={`/market/${id}/edit`}><i className="ms ms-edit" /> {ko ? "수정" : "Edit"}</Link> : null}
    <button type="button" onClick={() => void deleteListing()} disabled={!canDelete || isDeleting}><i className="ms ms-delete" /> {isDeleting ? ko ? "삭제 중…" : "Deleting..." : ko ? "삭제" : "Delete"}</button>
    {actionError ? <p className="manage-listing-action-error" role="alert">{actionError}</p> : null}
  </div>;
}
