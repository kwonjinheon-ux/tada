import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveJourneys } from "@/lib/market/active-journey";
import { MyPageClient } from "@/components/dashboard/MyPageClient";

/** Personal overview: scoped reads through the same authenticated client as the dashboard. */
export async function MyPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Fmy-page");
  const db = await createServerSupabaseClient();
  if (!db) return <MyPageClient data={null} />;
  const [profile, services, posts, activity, unread, sales, journeys, marketSaved, bargainSaved, communitySaved, serviceSaved, savedSearches, marketListings, bargainListings, sellingReservations, buyingReservations] = await Promise.all([
    db.from("profiles").select("display_name,avatar_path,region_city,region_suburb").eq("id", user.id).maybeSingle(),
    db.from("service_listings").select("id,provider_name,status,updated_at", { count: "exact" }).eq("owner_id", user.id).neq("status", "archived").order("updated_at", { ascending: false }).limit(6),
    db.from("community_posts").select("id,title,view_count,updated_at", { count: "exact" }).eq("author_id", user.id).eq("status", "published").order("updated_at", { ascending: false }).limit(6),
    db.from("market_notifications").select("id,type,title,body,href,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
    db.from("market_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
    db.from("market_trade_offers").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "completed"),
    getActiveJourneys(db, user.id),
    db.from("market_wishlist").select("listing_id", { count: "exact", head: true }).eq("user_id", user.id),
    db.from("bargain_wishlist").select("listing_id", { count: "exact", head: true }).eq("user_id", user.id),
    db.from("community_wishlist").select("post_id", { count: "exact", head: true }).eq("user_id", user.id),
    db.from("service_wishlist").select("service_id", { count: "exact", head: true }).eq("user_id", user.id),
    db.from("market_keyword_alerts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    db.from("market_listings").select("id", { count: "exact", head: true }).eq("owner_id", user.id).in("status", ["published", "pending"]),
    db.from("bargain_listings").select("id", { count: "exact", head: true }).eq("owner_id", user.id).in("status", ["published", "pending"]),
    db.from("bargain_item_reservations").select("id", { count: "exact", head: true }).eq("seller_id", user.id).in("status", ["requested", "confirmed", "on_the_way"]),
    db.from("bargain_item_reservations").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).in("status", ["requested", "confirmed", "on_the_way"]),
  ]);
  const avatarPath = profile.data?.avatar_path;
  const avatar = avatarPath ? await db.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600) : null;
  return <MyPageClient data={{
    name: profile.data?.display_name || "Tada member",
    avatar: avatar?.data?.signedUrl ?? null,
    location: [profile.data?.region_suburb, profile.data?.region_city].filter(Boolean).join(", "),
    joined: user.created_at,
    profileComplete: Boolean(profile.data?.display_name && avatarPath),
    phoneVerified: Boolean(user.phone_confirmed_at),
    services: services.data ?? [], posts: posts.data ?? [], activity: activity.data ?? [], journeys,
    unread: unread.error ? null : unread.count ?? 0,
    serviceCount: services.error ? null : services.count ?? 0,
    postCount: posts.error ? null : posts.count ?? 0,
    sales: sales.error ? null : sales.count ?? 0,
    savedCount: [marketSaved, bargainSaved, communitySaved, serviceSaved].some((result) => Boolean(result.error)) ? null : (marketSaved.count ?? 0) + (bargainSaved.count ?? 0) + (communitySaved.count ?? 0) + (serviceSaved.count ?? 0),
    savedSearchCount: savedSearches.error ? null : savedSearches.count ?? 0,
    activeListingCount: marketListings.error || bargainListings.error || services.error ? null : (marketListings.count ?? 0) + (bargainListings.count ?? 0) + (services.count ?? 0),
    activeReservationCount: sellingReservations.error || buyingReservations.error ? null : (sellingReservations.count ?? 0) + (buyingReservations.count ?? 0),
    unavailable: [profile, services, posts, activity, unread, sales, marketSaved, bargainSaved, communitySaved, serviceSaved, savedSearches, marketListings, bargainListings, sellingReservations, buyingReservations].some((result) => Boolean(result.error)),
  }} />;
}
