import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import ManageListingsPage from "../listings/page";

export const metadata = { title: "Manage Listings V0 | Tada" };

export default async function ManageListingsV0Page({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; page?: string }> }) {
  if (!await getServerUser()) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Flistings-v0");
  const params = await searchParams;
  return <ManageListingsPage searchParams={Promise.resolve({ ...params, version: "v0" })} />;
}
