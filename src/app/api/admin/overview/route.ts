import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ReportRow = { reported_user_id: string | null; domain: string; target_type: string; target_id: string; status: string; created_at: string };
type ProfileRow = { id: string; display_name: string; region_city: string | null; region_suburb: string | null; created_at: string };

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Admin tools are unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in.", 401);
  if (!await isMarketModerator(supabase)) return apiFailure("FORBIDDEN", "Administrator access is required.", 403);

  const [{ count: memberCount }, { count: reportCount }, { count: openReportCount }, { data: reportData }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("market_reports").select("id", { count: "exact", head: true }),
    supabase.from("market_reports").select("id", { count: "exact", head: true }).in("status", ["open", "in_review"]),
    supabase.from("market_reports").select("reported_user_id,domain,target_type,target_id,status,created_at").order("created_at", { ascending: false }).limit(1_000),
  ]);
  const reports = (reportData ?? []) as ReportRow[];
  const memberCounts = new Map<string, { reports: number; latest: string }>();
  const contentCounts = new Map<string, { domain: string; targetType: string; targetId: string; reports: number; latest: string }>();
  for (const report of reports) {
    if (report.reported_user_id) {
      const current = memberCounts.get(report.reported_user_id) ?? { reports: 0, latest: report.created_at };
      current.reports += 1; if (report.created_at > current.latest) current.latest = report.created_at;
      memberCounts.set(report.reported_user_id, current);
    }
    const key = `${report.domain}:${report.target_type}:${report.target_id}`;
    const currentContent = contentCounts.get(key) ?? { domain: report.domain, targetType: report.target_type, targetId: report.target_id, reports: 0, latest: report.created_at };
    currentContent.reports += 1; if (report.created_at > currentContent.latest) currentContent.latest = report.created_at;
    contentCounts.set(key, currentContent);
  }
  const mostReportedMembers = [...memberCounts.entries()].sort(([, a], [, b]) => b.reports - a.reports || b.latest.localeCompare(a.latest)).slice(0, 8);
  const profileIds = mostReportedMembers.map(([id]) => id);
  const { data: profileData } = profileIds.length ? await supabase.from("profiles").select("id,display_name,region_city,region_suburb,created_at").in("id", profileIds) : { data: [] };
  const profiles = new Map(((profileData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const mostReportedContent = [...contentCounts.values()].sort((a, b) => b.reports - a.reports || b.latest.localeCompare(a.latest)).slice(0, 8);
  const listingIds = mostReportedContent.filter((item) => item.domain === "market" && item.targetType === "listing").map((item) => item.targetId);
  const { data: listingData } = listingIds.length ? await supabase.from("market_listings").select("id,title").in("id", listingIds) : { data: [] };
  const titles = new Map((listingData ?? []).map((listing) => [listing.id, listing.title]));

  return apiSuccess({
    metrics: { members: memberCount ?? 0, reports: reportCount ?? 0, openReports: openReportCount ?? 0, highRiskMembers: [...memberCounts.values()].filter((item) => item.reports >= 3).length, highRiskContent: [...contentCounts.values()].filter((item) => item.reports >= 3).length },
    mostReportedMembers: mostReportedMembers.map(([id, count]) => ({ id, name: profiles.get(id)?.display_name ?? "Deleted member", location: [profiles.get(id)?.region_suburb, profiles.get(id)?.region_city].filter(Boolean).join(", ") || null, joinedAt: profiles.get(id)?.created_at ?? null, reportCount: count.reports, latestReportAt: count.latest })),
    mostReportedContent: mostReportedContent.map((item) => ({ ...item, title: titles.get(item.targetId) ?? `${item.domain} ${item.targetType}` })),
  });
}
