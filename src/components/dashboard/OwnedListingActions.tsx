"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { DialogOverlay } from "@/components/ui/DialogOverlay";

type Kind = "market" | "bargain" | "services";

export function OwnedListingActions({ id, title, kind, canEdit, canDelete, canRelist = false, canMarkSold = false }: {
  id: string; title: string; kind: Kind; canEdit: boolean; canDelete: boolean; canRelist?: boolean; canMarkSold?: boolean;
}) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"delete" | "sold" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const href = kind === "services" ? `/services/${id}` : `/market/${id}`;
  const editHref = `${href}/edit`;
  const apiHref = kind === "services" ? `/api/services/${id}` : kind === "bargain" ? `/api/bargain/listings/${id}` : `/api/market/listings/${id}`;
  const hasMoreActions = canEdit || canRelist || canMarkSold || canDelete;

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
      setConfirmAction(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ko ? "잠시 후 다시 시도해 주세요." : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return <>
    {hasMoreActions ? <div className="owned-listing-actions" ref={menuRef}>
        <IconButton className="owned-listing-more" aria-label={ko ? `${title} 더보기` : `More actions for ${title}`} aria-expanded={menuOpen} aria-controls={menuOpen ? `owned-listing-menu-${id}` : undefined} onClick={() => setMenuOpen((value) => !value)}>
          <i className="ms ms-more-vert" aria-hidden="true" />
        </IconButton>
        {menuOpen ? <div className="owned-listing-menu ui-panel menu-motion" id={`owned-listing-menu-${id}`}>
          {canEdit ? <Link href={editHref} onClick={() => setMenuOpen(false)}>{ko ? "수정" : "Edit"}</Link> : null}
          {canRelist ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => void runAction("POST")}>{ko ? "다시 올리기" : "Relist"}</Button> : null}
          {canMarkSold ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setMenuOpen(false); setConfirmAction("sold"); setError(null); }}>{ko ? "판매 완료로 변경" : "Mark as sold"}</Button> : null}
          {canDelete ? <Button variant="ghost" size="sm" className="is-danger" disabled={busy} onClick={() => { setMenuOpen(false); setConfirmAction("delete"); setError(null); }}>{ko ? "삭제" : "Delete"}</Button> : null}
        </div> : null}
      {error && !confirmAction ? <p role="alert" className="owned-listing-error">{error}</p> : null}
    </div> : null}
    {confirmAction ? <DialogOverlay className="owned-listing-dialog" aria-labelledby={`owned-listing-confirm-${id}`} onClose={() => setConfirmAction(null)} isDismissible={!busy}>
      <section className="ui-panel owned-listing-dialog-panel">
        <button className="owned-listing-dialog-close" type="button" aria-label={ko ? "닫기" : "Close"} disabled={busy} onClick={() => setConfirmAction(null)}><i className="ms ms-close" aria-hidden="true" /></button>
        <h2 id={`owned-listing-confirm-${id}`}>{confirmAction === "delete" ? ko ? "등록 항목을 삭제할까요?" : "Delete this listing?" : ko ? "판매 완료로 변경할까요?" : "Mark this listing as sold?"}</h2>
        <p>{confirmAction === "delete" ? ko ? `“${title}”과 등록 사진이 삭제되며 되돌릴 수 없어요.` : `“${title}” and its photos will be deleted. This cannot be undone.` : ko ? `“${title}”이 판매 완료로 표시되며 수정할 수 없게 돼요.` : `“${title}” will be marked as sold and can no longer be edited.`}</p>
        {error ? <p role="alert" className="owned-listing-error">{error}</p> : null}
        <p className="dialog-dismiss-hint">{ko ? "바깥을 누르면 닫혀요." : "Tap outside to close."}</p>
        <div className="owned-listing-dialog-actions"><Button variant="secondary" disabled={busy} onClick={() => setConfirmAction(null)}>{ko ? "취소" : "Cancel"}</Button><Button variant={confirmAction === "delete" ? "ghost" : "primary"} className={confirmAction === "delete" ? "is-danger" : undefined} disabled={busy} onClick={() => void runAction(confirmAction === "delete" ? "DELETE" : "PATCH")}><i className={`ms ${confirmAction === "delete" ? "ms-delete" : "ms-check-circle"}`} aria-hidden="true" />{busy ? ko ? "처리 중…" : "Working…" : confirmAction === "delete" ? ko ? "삭제" : "Delete" : ko ? "판매 완료" : "Mark as sold"}</Button></div>
      </section>
    </DialogOverlay> : null}
  </>;
}
