"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@/components/ui/IconButton";
import { useLanguage } from "@/components/LanguageProvider";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { readApiResponse } from "@/lib/api/client";
import { marketReportResponseSchema } from "@/contracts/api";

export function CommunityPostOwnerMenu({ postId, onEdit, onDelete }: { postId: string; onEdit?: () => void; onDelete?: () => void }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reason, setReason] = useState("other");
  const [details, setDetails] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  const submitReport = async () => { setIsSubmitting(true); setFeedback(null); try { const response = await fetch("/api/community/safety/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType: "listing", targetId: postId, reason, details }) }); if (response.status === 401) { router.push(`/login?redirectTo=${encodeURIComponent(`/community/${postId}`)}`); return; } const result = await readApiResponse(response, marketReportResponseSchema); if (!result.data) { setFeedback(result.error?.message ?? "Unable to submit this report."); return; } setDetails(""); setIsReportOpen(false); } catch { setFeedback("Unable to submit this report right now."); } finally { setIsSubmitting(false); } };
  return <><div ref={menuRef} className="community-post-owner-menu">
    <IconButton className="community-post-owner-menu-trigger" aria-label={t("communityPostOptions")} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}><i className="ti ti-dots-vertical" aria-hidden="true" /></IconButton>
    {isOpen ? <div className="community-post-owner-menu-popover" role="menu" aria-label={t("communityPostOptions")}>{onEdit ? <button type="button" role="menuitem" onClick={() => { setIsOpen(false); onEdit(); }}><i className="ti ti-edit" aria-hidden="true" />{t("communityEditPostHeading")}</button> : null}{onDelete ? <button className="is-danger" type="button" role="menuitem" onClick={() => { setIsOpen(false); onDelete(); }}><i className="ti ti-trash" aria-hidden="true" />{t("communityDeletePostAction")}</button> : null}<button type="button" role="menuitem" onClick={() => { setIsOpen(false); setIsReportOpen(true); }}><i className="ti ti-flag" aria-hidden="true" />Report post</button></div> : null}
  </div>{isReportOpen ? <DialogOverlay className="listing-report-dialog" aria-labelledby="community-report-title" onClose={() => setIsReportOpen(false)} isDismissible={!isSubmitting}><div className="listing-report-panel"><button className="listing-report-close" type="button" aria-label="Close report form" onClick={() => setIsReportOpen(false)}><i className="ti ti-x" aria-hidden="true" /></button><h2 id="community-report-title">Report post</h2><label>Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option value="fraud">Scam or fraud</option><option value="prohibited_item">Prohibited item</option><option value="harassment">Harassment</option><option value="spam">Spam</option><option value="inappropriate_content">Inappropriate content</option><option value="other">Other</option></select></label><label>Details (optional)<textarea value={details} maxLength={1000} rows={4} onChange={(event) => setDetails(event.target.value)} placeholder="Tell us what happened" /></label>{feedback ? <p role="alert">{feedback}</p> : null}<button className="listing-report-submit" type="button" disabled={isSubmitting} onClick={() => void submitReport()}>{isSubmitting ? "Submitting..." : "Submit report"}</button></div></DialogOverlay> : null}</>;
}
