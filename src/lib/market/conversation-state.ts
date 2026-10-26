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

/**
 * Writes only the state columns the authenticated role is allowed to change.
 *
 * This deliberately avoids PostgREST upsert here: an upsert's conflict update
 * includes the primary-key columns in its UPDATE shape, while this table grants
 * UPDATE only to the mutable state fields. Splitting inserts from updates
 * keeps the RLS/column-grant boundary tight and makes archive/restore work for
 * both first-time and previously touched conversations.
 */
export async function writeConversationStates(
  supabase: SupabaseClient,
  userId: string,
  conversationIds: string[],
  patch: { archived_at?: string | null; deleted_at?: string | null },
) {
  if (!conversationIds.length) return { error: null, conversationIds: [] as string[] };
  const { data: existingRows, error: existingError } = await supabase
    .from("market_conversation_states")
    .select("conversation_id")
    .eq("user_id", userId)
    .in("conversation_id", conversationIds);
  if (existingError) return { error: existingError, conversationIds: [] as string[] };

  const existingIds = new Set((existingRows ?? []).map((row) => row.conversation_id as string));
  const newIds = conversationIds.filter((conversationId) => !existingIds.has(conversationId));
  if (newIds.length) {
    const { error: insertError } = await supabase
      .from("market_conversation_states")
      .insert(newIds.map((conversationId) => ({ conversation_id: conversationId, user_id: userId, ...patch })));
    if (insertError) return { error: insertError, conversationIds: [] as string[] };
  }

  const updateIds = [...existingIds];
  if (updateIds.length) {
    const { error: updateError } = await supabase
      .from("market_conversation_states")
      .update(patch)
      .eq("user_id", userId)
      .in("conversation_id", updateIds);
    if (updateError) return { error: updateError, conversationIds: [] as string[] };
  }

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
