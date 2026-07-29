import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ProfileRow = { id: string; display_name: string; region_city: string | null; region_suburb: string | null; created_at: string };

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Admin tools are unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in.", 401);
  if (!await isMarketModerator(supabase)) return apiFailure("FORBIDDEN", "Administrator access is required.", 403);
  const [{ data: profileData }, { data: reportData }] = await Promise.all([
    supabase.from("profiles").select("id,display_name,region_city,region_suburb,created_at").order("created_at", { ascending: false }).limit(250),
    supabase.from("market_reports").select("reported_user_id").not("reported_user_id", "is", null).limit(1_000),
  ]);
  const counts = new Map<string, number>();
  for (const row of reportData ?? []) if (row.reported_user_id) counts.set(row.reported_user_id, (counts.get(row.reported_user_id) ?? 0) + 1);
  const members = ((profileData ?? []) as ProfileRow[]).map((profile) => ({ ...profile, reportCount: counts.get(profile.id) ?? 0 }));
  return apiSuccess({ members });
}
