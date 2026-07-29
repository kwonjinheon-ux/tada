import { marketBlockRequestSchema, marketBlockResponseSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { consumeMarketRateLimit } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Safety tools are unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in to block a member.", 401);
  const parsed = marketBlockRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.blockedUserId === user.id) return apiFailure("BAD_REQUEST", "Choose a valid member to block.", 400);
  if (!await consumeMarketRateLimit(supabase, "block")) return apiFailure("RATE_LIMITED", "Too many block requests. Please try again later.", 429);

  const { error } = await supabase.from("market_user_blocks").upsert({ blocker_id: user.id, blocked_id: parsed.data.blockedUserId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  if (error) return apiFailure("INTERNAL", "Unable to block this member right now.", 500);
  return apiSuccess(marketBlockResponseSchema.parse({ blocked: true }));
}
