import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import KeywordAlertsPage from "../keywords/page";

export const metadata = { title: "Keywords V0 | Tada" };

export default async function KeywordsV0Page() {
  if (!await getServerUser()) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Fkeywords-v0");
  return <KeywordAlertsPage />;
}
