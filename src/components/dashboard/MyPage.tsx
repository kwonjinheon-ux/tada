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
  const [profile, services, posts, activity, unread, sales, journeys] = await Promise.all([
    db.from("profiles").select("display_name,avatar_path,region_city,region_suburb").eq("id", user.id).maybeSingle(),
    db.from("service_listings").select("id,provider_name,status,updated_at", { count: "exact" }).eq("owner_id", user.id).neq("status", "archived").order("updated_at", { ascending: false }).limit(6),
    db.from("community_posts").select("id,title,view_count,updated_at", { count: "exact" }).eq("author_id", user.id).eq("status", "published").order("updated_at", { ascending: false }).limit(6),
    db.from("market_notifications").select("id,type,title,body,href,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
    db.from("market_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
    db.from("market_trade_offers").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "completed"),
    getActiveJourneys(db, user.id),
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
    unavailable: [profile, services, posts, activity, unread, sales].some((result) => Boolean(result.error)),
  }} />;
}
