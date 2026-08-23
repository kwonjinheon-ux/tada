import { ServiceProfileClient } from "@/components/services/ServiceProfileClient";

export const metadata = { title: "Service profile | Tada" };

export default async function ServiceProfilePage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  return <ServiceProfileClient serviceId={serviceId} />;
}
