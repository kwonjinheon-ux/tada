"use client";

import { useEffect, useMemo, useState } from "react";

type Member = { id: string; display_name: string; region_city: string | null; region_suburb: string | null; created_at: string; reportCount: number };

export function AdminMembersClient() {
  const [members, setMembers] = useState<Member[]>([]); const [error, setError] = useState<string | null>(null); const [query, setQuery] = useState("");
  useEffect(() => { void fetch("/api/admin/members").then(async (response) => { const payload = await response.json().catch(() => null) as { data?: { members?: Member[] }; error?: { message?: string } } | null; if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to load members."); setMembers(payload?.data?.members ?? []); }).catch((loadError: Error) => setError(loadError.message)); }, []);
  const filtered = useMemo(() => members.filter((member) => member.display_name.toLowerCase().includes(query.trim().toLowerCase())), [members, query]);
  return <section className="admin-members-panel"><header><p>Global operations</p><h1>Members</h1><span>Member profile information and report history across all service areas.</span></header><input className="admin-member-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search member name" aria-label="Search members" />{error ? <p className="moderation-error" role="alert">{error}</p> : null}<div className="admin-listing-table admin-member-table" role="table"><div className="admin-listing-row admin-listing-head" role="row"><span>Member</span><span>Location</span><span>Joined</span><span>Reports received</span></div>{filtered.map((member) => <div className="admin-listing-row" role="row" key={member.id}><span data-label="Member"><strong>{member.display_name}</strong><small>{member.id}</small></span><span data-label="Location">{[member.region_suburb, member.region_city].filter(Boolean).join(", ") || "—"}</span><span data-label="Joined">{new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(new Date(member.created_at))}</span><span data-label="Reports received"><b className={member.reportCount >= 3 ? "admin-risk-count" : ""}>{member.reportCount}</b></span></div>)}</div>{!error && !filtered.length ? <p className="moderation-empty">No matching members.</p> : null}</section>;
}
