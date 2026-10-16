import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import BargainReservationsPage from "../reservations/page";

export const metadata = { title: "Reservations V0 | Tada" };

export default async function ReservationsV0Page({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  if (!await getServerUser()) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Freservations-v0");
  const params = await searchParams;
  return <BargainReservationsPage searchParams={Promise.resolve({ ...params, version: "v0" })} />;
}
