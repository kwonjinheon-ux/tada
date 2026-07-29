import { redirect } from "next/navigation";
import { AdminMembersClient } from "@/components/admin/AdminMembersClient";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function AdminMembersPage() { const supabase = await createServerSupabaseClient(); if (!supabase) redirect("/"); const { data: { user } } = await supabase.auth.getUser(); if (!user || !await isMarketModerator(supabase)) redirect("/"); return <main className="marketplace-page dashboard-page dashboard-layout admin-page"><AdminSidebar active="members" /><div className="dashboard-content"><AdminMembersClient /></div></main>; }
