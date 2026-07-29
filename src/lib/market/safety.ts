import type { SupabaseClient } from "@supabase/supabase-js";

export async function consumeMarketRateLimit(supabase: SupabaseClient, action: "report" | "block" | "conversation" | "message" | "comment") {
  const { data, error } = await supabase.rpc("consume_market_rate_limit", { p_action: action });
  return !error && data === true;
}

export async function isMarketModerator(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("user_roles").select("role").maybeSingle();
  return !error && (data?.role === "moderator" || data?.role === "admin");
}
