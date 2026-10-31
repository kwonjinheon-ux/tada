import { apiFailure, apiSuccess } from "@/lib/api/response";
import { getServerUserId } from "@/lib/auth-server";
import { loadInbox } from "@/lib/market/messaging";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Messaging is unavailable right now.", 503);
  const userId = await getServerUserId();
  if (!userId) return apiFailure("UNAUTHORIZED", "Please log in.", 401);
  return apiSuccess({ conversations: await loadInbox(supabase, userId) }, { headers: { "Cache-Control": "no-store" } });
}
