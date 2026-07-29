"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Overview = { metrics: { members: number; reports: number; openReports: number; highRiskMembers: number; highRiskContent: number }; mostReportedMembers: Array<{ id: string; name: string; location: string | null; joinedAt: string | null; reportCount: number; latestReportAt: string }>; mostReportedContent: Array<{ domain: string; targetType: string; targetId: string; title: string; reports: number; latest: string }> };

export function AdminOverviewClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void fetch("/api/admin/overview").then(async (response) => { const payload = await response.json().catch(() => null) as { data?: Overview; error?: { message?: string } } | null; if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? "Unable to load admin overview."); setData(payload.data); }).catch((loadError: Error) => setError(loadError.message)); }, []);
  if (error) return <p className="moderation-error" role="alert">{error}</p>;
  if (!data) return <p className="moderation-empty">Loading operations overview…</p>;
  const cards = [["Members", data.metrics.members, "fa-users"], ["All reports", data.metrics.reports, "fa-flag"], ["Open queue", data.metrics.openReports, "fa-inbox"], ["High-risk members", data.metrics.highRiskMembers, "fa-triangle-exclamation"], ["High-risk content", data.metrics.highRiskContent, "fa-file-shield"]] as const;
  return <section className="admin-overview"><header><p>Global operations</p><h1>Admin overview</h1><span>Cross-category member and report risk signals. Community and future services feed into the same reporting model.</span></header><div className="admin-metric-grid">{cards.map(([label, value, icon]) => <article key={label}><i className={`fa-solid ${icon}`} aria-hidden="true" /><strong>{value.toLocaleString("en-NZ")}</strong><span>{label}</span></article>)}</div><div className="admin-insight-grid"><section><header><h2>Most reported members</h2><Link href="/admin/members">View members</Link></header>{data.mostReportedMembers.length ? <ol>{data.mostReportedMembers.map((member) => <li key={member.id}><div><strong>{member.name}</strong><span>{member.location ?? "Location not set"}</span></div><b>{member.reportCount} reports</b></li>)}</ol> : <p>No member reports yet.</p>}</section><section><header><h2>Most reported content</h2><Link href="/admin/moderation">Review reports</Link></header>{data.mostReportedContent.length ? <ol>{data.mostReportedContent.map((item) => <li key={`${item.domain}-${item.targetType}-${item.targetId}`}><div><strong>{item.title}</strong><span>{item.domain} · {item.targetType}</span></div><b>{item.reports} reports</b></li>)}</ol> : <p>No content reports yet.</p>}</section></div></section>;
}
