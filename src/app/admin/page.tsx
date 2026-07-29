import { redirect } from "next/navigation";
import { AdminOverviewClient } from "@/components/admin/AdminOverviewClient";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function AdminPage() { const supabase = await createServerSupabaseClient(); if (!supabase) redirect("/"); const { data: { user } } = await supabase.auth.getUser(); if (!user || !await isMarketModerator(supabase)) redirect("/"); return <main className="marketplace-page dashboard-page dashboard-layout admin-page"><AdminSidebar active="overview" /><div className="dashboard-content"><AdminOverviewClient /></div></main>; }
