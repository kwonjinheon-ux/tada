import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Rendered once by the dashboard segment layout, not by each page, so it is
 *  not torn down and rebuilt on every navigation. Active state comes from the
 *  URL inside DashboardNav. */
export async function DashboardSidebar({ context = "market" }: { context?: "market" | "jobs" }) {
  const user = await getServerUser();
  const supabase = await createServerSupabaseClient();
  const isMarket = context === "market" && Boolean(user) && Boolean(supabase);

  const [messages, notifications, role] = isMarket && user && supabase
    ? await Promise.all([
      supabase.from("market_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
      supabase.from("market_notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
      supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    ])
    : [{ count: 0 }, { count: 0 }, { data: null }];

  const roleName = (role as { data: { role?: string } | null }).data?.role;

  return (
    <aside className="market-filter-panel dashboard-sidebar" aria-label={`${context} dashboard navigation`}>
      <DashboardNav
        context={context}
        unreadMessageCount={messages.count ?? 0}
        unreadNotificationCount={notifications.count ?? 0}
        isAdmin={roleName === "admin" || roleName === "moderator"}
      />
    </aside>
  );
}
