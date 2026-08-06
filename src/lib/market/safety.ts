import type { SupabaseClient } from "@supabase/supabase-js";

export type MarketRateLimitResult = { allowed: boolean; reason?: "rate_limited" | "unavailable" };

export async function consumeMarketRateLimit(supabase: SupabaseClient, action: "report" | "block" | "conversation" | "message" | "comment"): Promise<MarketRateLimitResult> {
  const { data, error } = await supabase.rpc("consume_market_rate_limit", { p_action: action });
  if (error) return { allowed: false, reason: "unavailable" };
  return { allowed: data === true, reason: data === true ? undefined : "rate_limited" };
}

export async function isMarketModerator(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("user_roles").select("role").maybeSingle();
  return !error && (data?.role === "moderator" || data?.role === "admin");
}
