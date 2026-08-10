import { marketConversationArchiveRequestSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { resolveConversationTargets, writeConversationStates } from "@/lib/market/conversation-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Messaging is unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in.", 401);

  const parsed = marketConversationArchiveRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiFailure("BAD_REQUEST", "Choose the conversations to archive.", 400);
  const { archived, ...target } = parsed.data;

  const conversationIds = await resolveConversationTargets(supabase, user.id, target);
  if (!conversationIds) return apiFailure("INTERNAL", "Unable to update your conversations. Please try again.", 500);

  const { error, conversationIds: savedConversationIds } = await writeConversationStates(supabase, user.id, conversationIds, {
    archived_at: archived ? new Date().toISOString() : null,
  });
  if (error || savedConversationIds.length !== conversationIds.length) return apiFailure("INTERNAL", "Unable to update your conversations. Please try again.", 500);
  return apiSuccess({ conversationIds });
}
