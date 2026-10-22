import { redirect } from "next/navigation";
import { MarketNotificationsClient, type MarketNotification } from "@/components/notifications/MarketNotificationsClient";
import { defaultNotificationPreferences, type NotificationPreferences } from "@/components/notifications/NotificationSettingsDialog";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Notifications" };

type NotificationRow = {
  id: string;
  type: MarketNotification["type"];
  title: string;
  body: string;
  metadata: unknown;
  href: string;
  conversation_id: string | null;
  listing_id: string | null;
  community_post_id: string | null;
  service_listing_id: string | null;
  read_at: string | null;
  created_at: string;
};

function getNotificationContext(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return { actorName: null, listingTitle: null };
  }
  const values = metadata as Record<string, unknown>;
  return {
    actorName: typeof values.actorName === "string" ? values.actorName : null,
    listingTitle: typeof values.listingTitle === "string" ? values.listingTitle : null,
  };
}

export default async function MarketNotificationsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Fnotifications");
  const supabase = await createServerSupabaseClient();
  const [notificationResult, preferenceResult] = supabase
    ? await Promise.all([
      supabase
      .from("market_notifications")
      .select("id,type,title,body,metadata,href,conversation_id,listing_id,community_post_id,service_listing_id,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
      supabase.from("notification_preferences")
        .select("wishlist_enabled,keyword_enabled,community_enabled,service_reviews_enabled")
        .eq("user_id", user.id).maybeSingle(),
    ])
    : [{ data: [], error: null }, { data: null, error: { message: "Unavailable" } }];
  // If the new columns have not reached an environment yet, keep the existing
  // marketplace inbox readable while the migration is being applied.
  const fallbackRows = notificationResult.error && supabase
    ? (await supabase.from("market_notifications")
      .select("id,type,title,body,metadata,href,conversation_id,listing_id,read_at,created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100)).data
    : null;
  const preferences = { ...defaultNotificationPreferences, ...(preferenceResult.data ?? {}) } as NotificationPreferences;
  const notifications = ((notificationResult.data ?? fallbackRows ?? []) as NotificationRow[]).map((notification) => {
    const context = getNotificationContext(notification.metadata);
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      actorName: context.actorName,
      listingTitle: context.listingTitle,
      metadata: notification.metadata && typeof notification.metadata === "object" ? notification.metadata as Record<string, unknown> : {},
      href: notification.href,
      conversationId: notification.conversation_id,
      listingId: notification.listing_id,
      communityPostId: notification.community_post_id ?? null,
      serviceListingId: notification.service_listing_id ?? null,
      readAt: notification.read_at,
      createdAt: notification.created_at,
    };
  });

  return (
      <MarketNotificationsClient initialNotifications={notifications} initialPreferences={preferences} settingsAvailable={!preferenceResult.error} userId={user.id} />
  );
}
