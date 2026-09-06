"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readApiResponse } from "@/lib/api/client";
import { marketBlockResponseSchema, marketReportResponseSchema } from "@/contracts/api";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { useLanguage } from "@/components/LanguageProvider";

// Value plus the key its label lives under; the label itself is resolved in
// the component, where the locale is known.
const reasons = [
  ["fraud", "listingReportScam"],
  ["prohibited_item", "listingReportProhibited"],
  ["harassment", "listingReportHarassment"],
  ["spam", "listingReportSpam"],
  ["inappropriate_content", "listingReportInappropriate"],
  ["other", "listingReportOther"],
] as const;

export function ListingSafetyActions({ listingId, sellerId, sellerProfileVariant = false, iconOnly = false, space = "market" }: { listingId: string; sellerId: string | null; sellerProfileVariant?: boolean; iconOnly?: boolean; space?: "market" | "community" }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("fraud");
  const [details, setDetails] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReport = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/${space}/safety/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType: "listing", targetId: listingId, reason, details }) });
      if (response.status === 401) { router.push(`/login?redirectTo=${encodeURIComponent(`/${space}/${listingId}`)}`); return; }
      const result = await readApiResponse(response, marketReportResponseSchema);
      if (!result.data) { setFeedback(result.error?.message ?? t("listingReportFailed")); return; }
      setDetails("");
      setIsReportOpen(false);
      setFeedback(t("listingReportThanks"));
    } catch { setFeedback(t("listingReportFailed")); }
    finally { setIsSubmitting(false); }
  };

  const blockSeller = async () => {
    if (!sellerId || !window.confirm("Block this seller? You will no longer be able to message each other.")) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/market/safety/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockedUserId: sellerId }) });
      if (response.status === 401) { router.push(`/login?redirectTo=${encodeURIComponent(`/market/${listingId}`)}`); return; }
      const result = await readApiResponse(response, marketBlockResponseSchema);
      setFeedback(result.data?.blocked ? "Seller blocked. Messaging between these accounts is now disabled." : result.error?.message ?? t("listingBlockFailed"));
    } catch { setFeedback(t("listingBlockFailed")); }
    finally { setIsSubmitting(false); }
  };

  return <section className="listing-safety-actions" aria-label={t("listingSafetyTools")}>
    <div className={`listing-safety-buttons ${sellerProfileVariant ? "is-seller-profile-variant" : ""}`}>
      <button type="button" aria-label={t("listingReportListing")} title={t("listingReport")} onClick={() => setIsReportOpen(true)}><i className="ms ms-flag" aria-hidden="true" /> {!iconOnly && (sellerProfileVariant ? "신고" : "Report")}</button>
      {sellerId ? <button type="button" aria-label={t("listingBlockSeller")} title={t("listingBlockSeller")} onClick={() => void blockSeller()} disabled={isSubmitting}><i className="ms ms-block" aria-hidden="true" /> {!iconOnly && (sellerProfileVariant ? "차단" : "Block")}</button> : null}
    </div>
    {feedback ? <p role="status">{feedback}</p> : null}
    {isReportOpen ? <DialogOverlay className="listing-report-dialog" aria-labelledby="listing-report-title" onClose={() => setIsReportOpen(false)} isDismissible={!isSubmitting}>
      <div className="listing-report-panel">
        <button className="listing-report-close" type="button" aria-label={t("listingReportClose")} onClick={() => setIsReportOpen(false)}><i className="ms ms-close" aria-hidden="true" /></button>
        <h2 id="listing-report-title">{t("listingReportListing")}</h2>
        <label>{t("listingReportReason")}<select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)}>{reasons.map(([value, labelKey]) => <option key={value} value={value}>{t(labelKey)}</option>)}</select></label>
        <label>Details (optional)<textarea value={details} maxLength={1000} rows={4} onChange={(event) => setDetails(event.target.value)} placeholder={t("listingReportDetails")} /></label>
        <button className="listing-report-submit" type="button" disabled={isSubmitting} onClick={() => void submitReport()}>{isSubmitting ? t("listingReportSubmitting") : t("listingReportSubmit")}</button>
      </div>
    </DialogOverlay> : null}
  </section>;
}
