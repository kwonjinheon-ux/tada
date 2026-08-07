import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Comment counts for a set of listings, used to badge listing cards. Deleted
 * comments keep their row (for reply-thread structure) but are not something a
 * visitor would count as a comment, so they are excluded here.
 */
export async function getCommentCounts(supabase: SupabaseClient, listingIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!listingIds.length) return counts;
  const { data } = await supabase
    .from("market_listing_comments")
    .select("listing_id")
    .in("listing_id", listingIds)
    .is("deleted_at", null);
  for (const row of (data ?? []) as Array<{ listing_id: string }>) counts.set(row.listing_id, (counts.get(row.listing_id) ?? 0) + 1);
  return counts;
}
