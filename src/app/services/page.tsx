import { Suspense } from "react";
import { ServicesPageClient } from "@/components/services/ServicesPageClient";
import { RouteSkeleton } from "@/components/ui/RouteSkeleton";

export const metadata = { title: "Services | Tada" };

export default function ServicesPage() {
  return <Suspense fallback={<RouteSkeleton variant="services" />}><ServicesPageClient /></Suspense>;
}
