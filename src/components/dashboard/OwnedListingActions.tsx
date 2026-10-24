"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { DialogOverlay } from "@/components/ui/DialogOverlay";

type Kind = "market" | "bargain" | "services";

export function OwnedListingActions({ id, title, kind, status, canEdit, canDelete, canRelist = false, canMarkSold = false }: {
  id: string; title: string; kind: Kind; status: string; canEdit: boolean; canDelete: boolean; canRelist?: boolean; canMarkSold?: boolean;
}) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const href = kind === "services" ? `/services/${id}` : `/market/${id}`;
  const editHref = `${href}/edit`;
  const apiHref = kind === "services" ? `/api/services/${id}` : kind === "bargain" ? `/api/bargain/listings/${id}` : `/api/market/listings/${id}`;
  const primaryIsEdit = kind === "services" && status !== "published";

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [menuOpen]);

  const runAction = async (method: "DELETE" | "POST" | "PATCH") => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(apiHref, method === "PATCH" ? { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_sold" }) } : { method });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? (ko ? "요청을 처리하지 못했어요." : "Unable to complete this action."));
      setMenuOpen(false);
      setConfirmDelete(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ko ? "잠시 후 다시 시도해 주세요." : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return <>
    <div className="owned-listing-actions listing-row-actions">
      <Link className="ui-button ui-button--secondary ui-button--sm owned-listing-primary" href={primaryIsEdit ? editHref : href}>
        {primaryIsEdit ? ko ? "서비스 수정" : "Edit service" : kind === "services" ? ko ? "서비스 보기" : "View service" : status === "sold" ? ko ? "등록 내용 보기" : "View listing" : ko ? "상품 보기" : "View item"}
      </Link>
      <div className="owned-listing-more" ref={menuRef}>
        <IconButton aria-label={ko ? `${title} 더보기` : `More actions for ${title}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
          <i className="ms ms-more-vert" aria-hidden="true" />
        </IconButton>
        {menuOpen ? <div className="owned-listing-menu ui-panel menu-motion">
          <Link href={href} onClick={() => setMenuOpen(false)}>{ko ? "상세 보기" : "View details"}</Link>
          {canEdit ? <Link href={editHref} onClick={() => setMenuOpen(false)}>{ko ? "수정" : "Edit"}</Link> : null}
          {canRelist ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => void runAction("POST")}>{ko ? "다시 올리기" : "Relist"}</Button> : null}
          {canMarkSold ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => void runAction("PATCH")}>{ko ? "판매 완료로 변경" : "Mark as sold"}</Button> : null}
          {canDelete ? <Button variant="ghost" size="sm" className="is-danger" disabled={busy} onClick={() => { setMenuOpen(false); setConfirmDelete(true); setError(null); }}>{ko ? "삭제" : "Delete"}</Button> : null}
        </div> : null}
      </div>
      {error && !confirmDelete ? <p role="alert" className="owned-listing-error">{error}</p> : null}
    </div>
    {confirmDelete ? <DialogOverlay className="owned-listing-dialog" aria-labelledby={`owned-listing-delete-${id}`} onClose={() => setConfirmDelete(false)} isDismissible={!busy}>
      <section className="ui-panel owned-listing-dialog-panel">
        <button className="owned-listing-dialog-close" type="button" aria-label={ko ? "닫기" : "Close"} disabled={busy} onClick={() => setConfirmDelete(false)}><i className="ms ms-close" aria-hidden="true" /></button>
        <h2 id={`owned-listing-delete-${id}`}>{ko ? "등록 항목을 삭제할까요?" : "Delete this listing?"}</h2>
        <p>{ko ? `“${title}”과 등록 사진이 삭제되며 되돌릴 수 없어요.` : `“${title}” and its photos will be deleted. This cannot be undone.`}</p>
        {error ? <p role="alert" className="owned-listing-error">{error}</p> : null}
        <p className="dialog-dismiss-hint">{ko ? "바깥을 누르면 닫혀요." : "Tap outside to close."}</p>
        <div className="owned-listing-dialog-actions"><Button variant="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>{ko ? "취소" : "Cancel"}</Button><Button variant="ghost" className="is-danger" disabled={busy} onClick={() => void runAction("DELETE")}><i className="ms ms-delete" aria-hidden="true" />{busy ? ko ? "삭제 중…" : "Deleting…" : ko ? "삭제" : "Delete"}</Button></div>
      </section>
    </DialogOverlay> : null}
  </>;
}
