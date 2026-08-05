import { redirect } from "next/navigation";
import { AdminAdvertisingClient, type AdminAd } from "@/components/admin/AdminAdvertisingClient";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdvertisingPage() {
  const supabase = await createServerSupabaseClient(); if (!supabase) redirect("/"); const { data: { user } } = await supabase.auth.getUser(); if (!user || !await isMarketModerator(supabase)) redirect("/");
  const { data: ads } = await supabase.from("ads").select("id,name,provider,placement,is_active,priority,starts_at,ends_at").order("created_at", { ascending: false });
  const initialAds: AdminAd[] = (ads ?? []).map((ad) => ({ id: ad.id, name: ad.name, provider: ad.provider, placement: ad.placement, isActive: ad.is_active, priority: ad.priority, startsAt: ad.starts_at, endsAt: ad.ends_at }));
  return <main className="marketplace-page dashboard-page dashboard-layout admin-page"><AdminSidebar active="advertising" /><section className="dashboard-content admin-listings-panel admin-advertising-page"><header><p>Advertising operations</p><h1>Advertising</h1><span>Set up sponsored placements or approved AdSense inventory without leaving the admin centre.</span></header><AdminAdvertisingClient initialAds={initialAds} /></section></main>;
}
