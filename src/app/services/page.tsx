import { Suspense } from "react";
import { ServicesPageClient } from "@/components/services/ServicesPageClient";

export const metadata = { title: "Services | Tada" };

export default function ServicesPage() {
  return <Suspense fallback={null}><ServicesPageClient /></Suspense>;
}
