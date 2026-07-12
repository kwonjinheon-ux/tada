import { SellerDashboard } from "@/app/account/page";

export const metadata = { title: "Marketplace Dashboard" };

export default function MarketplaceDashboardPage() {
  return <SellerDashboard context="market" />;
}
