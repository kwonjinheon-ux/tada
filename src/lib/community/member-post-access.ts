import "server-only";

import type { createServerSupabaseClient } from "@/lib/supabase/server";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
export type CommunityProfileVisibility = "public" | "members" | "interested_users" | "trade_partners" | "private";

type PublicMemberProfile = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  profile_visibility: CommunityProfileVisibility;
};

const hasTradeRelationship = async (supabase: SupabaseServerClient, viewerId: string, authorId: string) => {
  const [offerAsSeller, offerAsBuyer, reservationAsSeller, reservationAsBuyer] = await Promise.all([
    supabase.from("market_trade_offers").select("id").eq("seller_id", authorId).eq("buyer_id", viewerId).eq("status", "accepted").limit(1),
    supabase.from("market_trade_offers").select("id").eq("seller_id", viewerId).eq("buyer_id", authorId).eq("status", "accepted").limit(1),
    supabase.from("bargain_item_reservations").select("id").eq("seller_id", authorId).eq("buyer_id", viewerId).in("status", ["confirmed", "on_the_way"]).limit(1),
    supabase.from("bargain_item_reservations").select("id").eq("seller_id", viewerId).eq("buyer_id", authorId).in("status", ["confirmed", "on_the_way"]).limit(1),
  ]);
  return Boolean((offerAsSeller.data?.length ?? 0) || (offerAsBuyer.data?.length ?? 0) || (reservationAsSeller.data?.length ?? 0) || (reservationAsBuyer.data?.length ?? 0));
};

/**
 * Community "other posts" access follows the same five profile choices as
 * marketplace profiles. Individual published posts remain discoverable in
 * their original context; this gate only controls the author's post index.
 */
export async function loadCommunityMemberPostAccess(supabase: SupabaseServerClient, authorId: string) {
  const [{ data: profile }, { data: { user } }] = await Promise.all([
    supabase.from("public_member_profiles").select("id,display_name,avatar_path,profile_visibility").eq("id", authorId).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const member = profile as PublicMemberProfile | null;
  if (!member) return { member: null, canView: false, viewerId: user?.id ?? null };
  if (user?.id === authorId || member.profile_visibility === "public") return { member, canView: true, viewerId: user?.id ?? null };
  if (member.profile_visibility === "private" || !user) return { member, canView: false, viewerId: user?.id ?? null };
  if (member.profile_visibility === "members") return { member, canView: true, viewerId: user.id };

  const { data: posts } = await supabase.from("community_posts").select("id").eq("author_id", authorId).eq("status", "published").limit(500);
  const postIds = (posts ?? []).map((post) => post.id);
  if (member.profile_visibility === "interested_users") {
    if (!postIds.length) return { member, canView: false, viewerId: user.id };
    const [saved, commented] = await Promise.all([
      supabase.from("community_wishlist").select("post_id").eq("user_id", user.id).in("post_id", postIds).limit(1),
      supabase.from("community_post_comments").select("id").eq("author_id", user.id).is("deleted_at", null).in("post_id", postIds).limit(1),
    ]);
    return { member, canView: Boolean((saved.data?.length ?? 0) || (commented.data?.length ?? 0)), viewerId: user.id };
  }

  return { member, canView: await hasTradeRelationship(supabase, user.id, authorId), viewerId: user.id };
}
