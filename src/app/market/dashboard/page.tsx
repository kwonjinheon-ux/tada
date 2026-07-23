import { SellerDashboard } from "@/components/dashboard/SellerDashboard";

export const metadata = { title: "Marketplace Dashboard" };

export default function MarketplaceDashboardPage() {
  return <SellerDashboard context="market" />;
}
