import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Admin tools are unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in.", 401);
  if (!await isMarketModerator(supabase)) return apiFailure("FORBIDDEN", "Administrator access is required.", 403);
  const { data, error } = await supabase.from("market_listings").select("id,title,owner_id,price_cents,status,created_at,region_city,region_suburb").order("created_at", { ascending: false }).limit(250);
  if (error) return apiFailure("INTERNAL", "Unable to load marketplace listings.", 500);
  return apiSuccess({ listings: data ?? [] });
}
