import type { SupabaseClient } from "@supabase/supabase-js";

export type ConversationScope = "inbox" | "archived";
export type ConversationStateRow = { conversation_id: string; archived_at: string | null; deleted_at: string | null };
export type ConversationBulkTarget = { conversationIds: string[] } | { scope: ConversationScope };

/**
 * Resolves a bulk request to the conversation ids the signed-in user may act
 * on. Explicit ids are intersected with the user's own conversations so a
 * caller cannot reach into somebody else's inbox even before RLS sees the
 * write; a scope resolves against what that view currently holds.
 *
 * Already-deleted conversations are never returned: they are invisible to the
 * user, so acting on them would be a no-op at best and a resurrection at worst.
 */
export async function resolveConversationTargets(
  supabase: SupabaseClient,
  userId: string,
  target: ConversationBulkTarget,
): Promise<string[] | null> {
  const [{ data: conversationRows, error: conversationError }, { data: stateRows, error: stateError }] = await Promise.all([
    supabase.from("market_conversations").select("id").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
    supabase.from("market_conversation_states").select("conversation_id,archived_at,deleted_at").eq("user_id", userId),
  ]);
  if (conversationError || stateError) return null;

  const states = new Map(((stateRows ?? []) as ConversationStateRow[]).map((state) => [state.conversation_id, state]));
  const owned = ((conversationRows ?? []) as Array<{ id: string }>)
    .map((conversation) => conversation.id)
    .filter((id) => !states.get(id)?.deleted_at);

  if ("conversationIds" in target) {
    const requested = new Set(target.conversationIds);
    return owned.filter((id) => requested.has(id));
  }
  return target.scope === "archived"
    ? owned.filter((id) => Boolean(states.get(id)?.archived_at))
    : owned.filter((id) => !states.get(id)?.archived_at);
}

/** Upserts the user's own state row for each conversation. */
export async function writeConversationStates(
  supabase: SupabaseClient,
  userId: string,
  conversationIds: string[],
  patch: { archived_at?: string | null; deleted_at?: string | null },
) {
  if (!conversationIds.length) return { error: null, conversationIds: [] as string[] };
  const rows = conversationIds.map((conversationId) => ({
    conversation_id: conversationId,
    user_id: userId,
    ...patch,
  }));
  const { error } = await supabase
    .from("market_conversation_states")
    .upsert(rows, { onConflict: "conversation_id,user_id" });
  if (error) return { error, conversationIds: [] as string[] };

  // PostgREST may use a minimal representation for an upsert even when the
  // mutation succeeds. Verify with the user's readable state rows instead of
  // mistaking that empty representation for a failed archive or delete.
  const { data: savedRows, error: verificationError } = await supabase
    .from("market_conversation_states")
    .select("conversation_id")
    .eq("user_id", userId)
    .in("conversation_id", conversationIds);
  return { error: verificationError, conversationIds: (savedRows ?? []).map((row) => row.conversation_id as string) };
}
