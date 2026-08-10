import { marketConversationBulkRequestSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { resolveConversationTargets, writeConversationStates } from "@/lib/market/conversation-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Messaging is unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in.", 401);

  const parsed = marketConversationBulkRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiFailure("BAD_REQUEST", "Choose the conversations to delete.", 400);

  const conversationIds = await resolveConversationTargets(supabase, user.id, parsed.data);
  if (!conversationIds) return apiFailure("INTERNAL", "Unable to delete your conversations. Please try again.", 500);

  // Deleting is one-sided: it marks this user's copy, leaving the counterpart's
  // record of the trade intact. The row itself only goes once both have deleted.
  const { error, conversationIds: deletedConversationIds } = await writeConversationStates(supabase, user.id, conversationIds, {
    deleted_at: new Date().toISOString(),
    archived_at: null,
  });
  if (error || deletedConversationIds.length !== conversationIds.length) return apiFailure("INTERNAL", "Unable to delete your conversations. Please try again.", 500);

  if (conversationIds.length) {
    const { error: pruneError } = await supabase.rpc("prune_orphaned_market_conversations", { target_ids: conversationIds });
    if (pruneError) return apiFailure("INTERNAL", "Your conversations were deleted, but cleanup could not finish. Please refresh and try again.", 500);
  }
  return apiSuccess({ conversationIds });
}
