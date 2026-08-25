import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

/** The dashboard shell. Every page under this segment renders only its own
 *  content surface — the page frame and the rail live here, so Next keeps them
 *  mounted across navigation and the sidebar cannot shift between sections. */
export default function MarketDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="marketplace-page dashboard-page dashboard-layout">
      <DashboardSidebar context="market" />
      {children}
    </main>
  );
}
