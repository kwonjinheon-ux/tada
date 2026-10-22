import { redirect } from "next/navigation";
import { MarketNotificationsClient, type MarketNotification } from "@/components/notifications/MarketNotificationsClient";
import { defaultNotificationPreferences, type NotificationPreferences } from "@/components/notifications/NotificationSettingsDialog";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

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
  const rows = (notificationResult.data ?? fallbackRows ?? []) as NotificationRow[];
  const listingIds = [...new Set(rows.flatMap((row) => row.listing_id ? [row.listing_id] : []))];
  const postIds = [...new Set(rows.flatMap((row) => row.community_post_id ? [row.community_post_id] : []))];
  const serviceIds = [...new Set(rows.flatMap((row) => row.service_listing_id ? [row.service_listing_id] : []))];
  const [marketPhotos, postPhotos, servicePhotos] = supabase ? await Promise.all([
    listingIds.length ? supabase.from("market_listing_photos").select("listing_id,storage_path,is_primary,display_order").in("listing_id", listingIds).order("display_order") : Promise.resolve({ data: [] }),
    postIds.length ? supabase.from("community_post_images").select("post_id,storage_path,display_order").in("post_id", postIds).order("display_order") : Promise.resolve({ data: [] }),
    serviceIds.length ? supabase.from("service_listing_photos").select("listing_id,storage_path,photo_kind,display_order").in("listing_id", serviceIds).order("display_order") : Promise.resolve({ data: [] }),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  const marketPaths = new Map<string, string>();
  for (const photo of marketPhotos.data ?? []) {
    if (photo.storage_path && (!marketPaths.has(photo.listing_id) || photo.is_primary)) marketPaths.set(photo.listing_id, photo.storage_path);
  }
  const postPaths = new Map<string, string>();
  for (const photo of postPhotos.data ?? []) {
    if (photo.storage_path && !postPaths.has(photo.post_id)) postPaths.set(photo.post_id, photo.storage_path);
  }
  const servicePaths = new Map<string, { path: string; kind: string | null }>();
  for (const photo of servicePhotos.data ?? []) {
    const current = servicePaths.get(photo.listing_id);
    if (photo.storage_path && (!current || (current.kind === "logo" && photo.photo_kind !== "logo"))) {
      servicePaths.set(photo.listing_id, { path: photo.storage_path, kind: photo.photo_kind });
    }
  }
  const [marketImages, postImages, serviceImages] = await Promise.all([
    getSignedStorageImages("market-listing-images", [...marketPaths.values()], "card"),
    getSignedStorageImages("community-post-images", [...postPaths.values()], "card"),
    getSignedStorageImages("service-listing-images", [...servicePaths.values()].map((photo) => photo.path), "card"),
  ]);
  const notifications = rows.map((notification) => {
    const context = getNotificationContext(notification.metadata);
    const marketPath = marketPaths.get(notification.listing_id ?? "");
    const postPath = postPaths.get(notification.community_post_id ?? "");
    const servicePath = servicePaths.get(notification.service_listing_id ?? "")?.path;
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
      imageUrl: (marketPath ? marketImages.get(marketPath) : null)
        ?? (postPath ? postImages.get(postPath) : null)
        ?? (servicePath ? serviceImages.get(servicePath) : null)
        ?? null,
      readAt: notification.read_at,
      createdAt: notification.created_at,
    };
  });

  return (
      <MarketNotificationsClient initialNotifications={notifications} initialPreferences={preferences} settingsAvailable={!preferenceResult.error} userId={user.id} />
  );
}
