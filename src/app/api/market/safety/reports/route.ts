import { marketReportRequestSchema, marketReportResponseSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { consumeMarketRateLimit } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Safety tools are unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in to submit a report.", 401);
  const parsed = marketReportRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiFailure("BAD_REQUEST", "Choose a valid report reason.", 400);
  if (!await consumeMarketRateLimit(supabase, "report")) return apiFailure("RATE_LIMITED", "You have submitted too many reports. Please try again later.", 429);

  const { data, error } = await supabase
    .from("market_reports")
    .insert({ reporter_id: user.id, domain: "market", target_type: parsed.data.targetType, target_id: parsed.data.targetId, reason: parsed.data.reason, details: parsed.data.details || null })
    .select("id,status")
    .single();
  if (error || !data) return apiFailure("BAD_REQUEST", "Unable to submit this report.", 400);
  return apiSuccess(marketReportResponseSchema.parse({ reportId: data.id, status: data.status }), { status: 201 });
}
