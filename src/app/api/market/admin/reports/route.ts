import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Moderation is unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in.", 401);
  if (!await isMarketModerator(supabase)) return apiFailure("FORBIDDEN", "Moderator access is required.", 403);

  const { data, error } = await supabase
    .from("market_reports")
    .select("id,target_type,target_id,reported_user_id,reason,details,status,reviewer_note,created_at,reviewed_at")
    .in("status", ["open", "in_review"])
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return apiFailure("INTERNAL", "Unable to load the moderation queue.", 500);
  return apiSuccess({ reports: data ?? [] });
}
