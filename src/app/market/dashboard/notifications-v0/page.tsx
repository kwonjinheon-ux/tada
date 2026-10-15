import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import MarketNotificationsPage from "../notifications/page";

export const metadata = { title: "Notifications V0 | Tada" };

export default async function NotificationsV0Page() {
  if (!await getServerUser()) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Fnotifications-v0");
  return <MarketNotificationsPage />;
}
