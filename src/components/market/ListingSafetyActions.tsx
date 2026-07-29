"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readApiResponse } from "@/lib/api/client";
import { marketBlockResponseSchema, marketReportResponseSchema } from "@/contracts/api";

const reasons = [
  ["fraud", "Scam or fraud"],
  ["prohibited_item", "Prohibited item"],
  ["harassment", "Harassment"],
  ["spam", "Spam"],
  ["inappropriate_content", "Inappropriate content"],
  ["other", "Other"],
] as const;

export function ListingSafetyActions({ listingId, sellerId }: { listingId: string; sellerId: string | null }) {
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
      const response = await fetch("/api/market/safety/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType: "listing", targetId: listingId, reason, details }) });
      if (response.status === 401) { router.push(`/login?redirectTo=${encodeURIComponent(`/market/${listingId}`)}`); return; }
      const result = await readApiResponse(response, marketReportResponseSchema);
      if (!result.data) { setFeedback(result.error?.message ?? "Unable to submit this report."); return; }
      setDetails("");
      setIsReportOpen(false);
      setFeedback("Thanks. Your report has been sent to our moderation team.");
    } catch { setFeedback("Unable to submit this report right now."); }
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
      setFeedback(result.data?.blocked ? "Seller blocked. Messaging between these accounts is now disabled." : result.error?.message ?? "Unable to block this seller.");
    } catch { setFeedback("Unable to block this seller right now."); }
    finally { setIsSubmitting(false); }
  };

  return <section className="listing-safety-actions" aria-label="Listing safety tools">
    <div>
      <strong>Stay safe</strong>
      <span>Report suspicious listings or block a seller.</span>
    </div>
    <div className="listing-safety-buttons">
      <button type="button" onClick={() => setIsReportOpen(true)}><i className="fa-regular fa-flag" aria-hidden="true" /> Report</button>
      {sellerId ? <button type="button" onClick={() => void blockSeller()} disabled={isSubmitting}><i className="fa-solid fa-ban" aria-hidden="true" /> Block seller</button> : null}
    </div>
    {feedback ? <p role="status">{feedback}</p> : null}
    {isReportOpen ? <div className="listing-report-dialog" role="dialog" aria-modal="true" aria-labelledby="listing-report-title">
      <div className="listing-report-panel">
        <button className="listing-report-close" type="button" aria-label="Close report form" onClick={() => setIsReportOpen(false)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        <h2 id="listing-report-title">Report listing</h2>
        <label>Reason<select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)}>{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Details (optional)<textarea value={details} maxLength={1000} rows={4} onChange={(event) => setDetails(event.target.value)} placeholder="Tell us what happened" /></label>
        <button className="listing-report-submit" type="button" disabled={isSubmitting} onClick={() => void submitReport()}>{isSubmitting ? "Submitting..." : "Submit report"}</button>
      </div>
    </div> : null}
  </section>;
}
