"use client";

import { useEffect, useState } from "react";

type Report = { id: string; target_type: string; target_id: string; reported_user_id: string | null; reason: string; details: string | null; status: "open" | "in_review"; created_at: string };

export function ModerationQueue() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  useEffect(() => {
    void fetch("/api/market/admin/reports")
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { data?: { reports?: Report[] }; error?: { message?: string } } | null;
        if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to load reports.");
        setReports(payload?.data?.reports ?? []);
      })
      .catch((loadError: Error) => setError(loadError.message));
  }, []);

  const review = async (report: Report, status: "in_review" | "resolved" | "dismissed", action: "none" | "warning" | "suspension" | "listing_hidden" = "none") => {
    setBusyId(report.id);
    setError(null);
    try {
      const response = await fetch(`/api/market/admin/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, action, suspensionHours: action === "suspension" ? 24 : undefined }) });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to update report.");
      setReports((current) => current.filter((item) => item.id !== report.id));
    } catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : "Unable to update report."); }
    finally { setBusyId(null); }
  };

  return <section className="moderation-queue">
    <header><p>Operations</p><h1>Moderation queue</h1><span>Review member safety reports and apply proportionate actions.</span></header>
    {error ? <p className="moderation-error" role="alert">{error}</p> : null}
    {!error && !reports.length ? <p className="moderation-empty">No open reports. The queue is clear.</p> : null}
    <div className="moderation-report-list">{reports.map((report) => <article key={report.id}>
      <div className="moderation-report-meta"><span>{report.target_type}</span><time>{new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.created_at))}</time></div>
      <h2>{report.reason.replaceAll("_", " ")}</h2>
      <p>{report.details || "No additional details provided."}</p>
      <small>Target: {report.target_id}</small>
      <div className="moderation-actions"><button disabled={busyId === report.id} onClick={() => void review(report, "in_review")}>Start review</button><button disabled={busyId === report.id} onClick={() => void review(report, "dismissed")}>Dismiss</button><button disabled={busyId === report.id} onClick={() => void review(report, "resolved", "warning")}>Warn member</button>{report.target_type === "listing" ? <button disabled={busyId === report.id} onClick={() => void review(report, "resolved", "listing_hidden")}>Hide listing</button> : <button disabled={busyId === report.id} onClick={() => void review(report, "resolved", "suspension")}>Suspend 24h</button>}</div>
    </article>)}</div>
  </section>;
}
