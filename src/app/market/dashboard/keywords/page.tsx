import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { KeywordAlertsClient, type KeywordAlert } from "@/components/market/KeywordAlertsClient";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Keyword Alerts" };

export default async function KeywordAlertsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Fkeywords");
  const supabase = await createServerSupabaseClient();
  const { data: alertRows } = supabase
    ? await supabase.from("market_keyword_alerts").select("id,keyword,category_slug").eq("user_id", user.id).order("created_at", { ascending: false })
    : { data: [] };
  const initialAlerts: KeywordAlert[] = (alertRows ?? []).map((alert) => ({ id: alert.id, keyword: alert.keyword, categorySlug: alert.category_slug }));

  return (
    <main className="marketplace-page dashboard-page dashboard-layout keywords-page">
      <DashboardSidebar context="market" active="Keywords" />
      <KeywordAlertsClient initialAlerts={initialAlerts} />
    </main>
  );
}
