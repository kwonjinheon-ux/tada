import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdvertisingPage() {
  const supabase = await createServerSupabaseClient(); if (!supabase) redirect("/"); const { data: { user } } = await supabase.auth.getUser(); if (!user || !await isMarketModerator(supabase)) redirect("/");
  const { data: ads } = await supabase.from("ads").select("id,name,provider,placement,is_active,priority,starts_at,ends_at").order("created_at", { ascending: false });
  return <main className="marketplace-page dashboard-page dashboard-layout admin-page"><AdminSidebar active="advertising" /><section className="dashboard-content admin-listings-panel"><header><p>Advertising operations</p><h1>Advertising</h1><span>Create ads through the database-backed advertising API. Active placements render automatically in the marketplace.</span></header><div className="admin-listing-table" role="table"><div className="admin-listing-row admin-listing-head" role="row"><span>Name</span><span>Provider</span><span>Placement</span><span>Status</span></div>{(ads ?? []).map((ad) => <div className="admin-listing-row" role="row" key={ad.id}><span>{ad.name}</span><span>{ad.provider}</span><span>{ad.placement}</span><span>{ad.is_active ? "Active" : "Disabled"}</span></div>)}</div>{!(ads?.length) ? <p className="moderation-empty">No advertising campaigns yet.</p> : null}</section></main>;
}
