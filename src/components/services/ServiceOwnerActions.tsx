"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DialogOverlay } from "@/components/ui/DialogOverlay";

export function ServiceOwnerActions({ serviceId, providerName, compact = false }: { serviceId: string; providerName: string; compact?: boolean }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteService = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/services/${serviceId}`, { method: "DELETE" });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Unable to delete this service.");
      setIsConfirming(false);
      if (compact) router.refresh();
      else router.replace("/services");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete this service.");
    } finally {
      setIsDeleting(false);
    }
  };

  return <>
    <div className={`service-owner-actions ${compact ? "is-compact" : ""}`} aria-label="Your service controls">
      <Link href={`/services/${serviceId}/edit`}><i className="ms ms-edit" aria-hidden="true" /> 수정</Link>
      <button className="is-danger" type="button" onClick={() => { setError(null); setIsConfirming(true); }}><i className="ms ms-delete" aria-hidden="true" /> 삭제</button>
    </div>
    {isConfirming ? <DialogOverlay className="service-delete-dialog" aria-labelledby="service-delete-title" onClose={() => setIsConfirming(false)} isDismissible={!isDeleting}>
      <section className="service-delete-dialog-panel">
        <button className="service-delete-dialog-close" type="button" aria-label="닫기" disabled={isDeleting} onClick={() => setIsConfirming(false)}><i className="ms ms-close" aria-hidden="true" /></button>
        <p>내 서비스 관리</p><h2 id="service-delete-title">서비스를 삭제할까요?</h2>
        <span>“{providerName}” 서비스와 등록한 사진이 영구적으로 삭제됩니다.</span>
        {error ? <small role="alert">{error}</small> : null}
        <div><button type="button" disabled={isDeleting} onClick={() => setIsConfirming(false)}>취소</button><button className="is-danger" type="button" disabled={isDeleting} onClick={() => void deleteService()}>{isDeleting ? "삭제 중…" : "삭제"}</button></div>
      </section>
    </DialogOverlay> : null}
  </>;
}
