import { redirect } from "next/navigation";
import { AdminListingsClient } from "@/components/admin/AdminListingsClient";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Listings" };

export default async function AdminListingsPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !await isMarketModerator(supabase)) redirect("/");
  return <main className="marketplace-page dashboard-page dashboard-layout admin-page"><AdminSidebar active="listings" /><div className="dashboard-content"><AdminListingsClient /></div></main>;
}
