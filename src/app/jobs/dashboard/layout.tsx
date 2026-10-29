import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

/** Mirrors the marketplace dashboard shell so both verticals share one frame. */
export default function JobsDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="marketplace-page dashboard-page dashboard-layout">
      <DashboardSidebar context="jobs" />
      {children}
    </main>
  );
}
