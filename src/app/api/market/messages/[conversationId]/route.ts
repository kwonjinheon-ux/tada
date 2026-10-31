import { apiFailure, apiSuccess } from "@/lib/api/response";
import { getServerUserId } from "@/lib/auth-server";
import { loadThread } from "@/lib/market/messaging";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Messaging is unavailable right now.", 503);
  const userId = await getServerUserId();
  if (!userId) return apiFailure("UNAUTHORIZED", "Please log in.", 401);
  const { conversationId } = await params;
  // Row-level security limits both reads to conversations the caller is part of.
  return apiSuccess(await loadThread(supabase, userId, conversationId), { headers: { "Cache-Control": "no-store" } });
}
