import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import MarketMessagesPage from "../messages/page";

export const metadata = { title: "Messages V0 | Tada" };

export default async function MessagesV0Page({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  if (!await getServerUser()) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Fmessages-v0");
  const params = await searchParams;
  return <MarketMessagesPage searchParams={Promise.resolve({ ...params, version: "v0" })} />;
}
