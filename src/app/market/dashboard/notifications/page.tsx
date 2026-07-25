import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MarketNotificationsClient, type MarketNotification } from "@/components/notifications/MarketNotificationsClient";
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
  const { data } = supabase
    ? await supabase
      .from("market_notifications")
      .select("id,type,title,body,metadata,href,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
    : { data: [] };
  const notifications = ((data ?? []) as NotificationRow[]).map((notification) => {
    const context = getNotificationContext(notification.metadata);
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      actorName: context.actorName,
      listingTitle: context.listingTitle,
      href: notification.href,
      readAt: notification.read_at,
      createdAt: notification.created_at,
    };
  });

  return (
    <main className="marketplace-page dashboard-page dashboard-layout notifications-page">
      <DashboardSidebar context="market" active="Notifications" />
      <MarketNotificationsClient initialNotifications={notifications} userId={user.id} />
    </main>
  );
}
