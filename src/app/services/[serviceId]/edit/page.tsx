import { ServiceEditClient } from "@/components/services/ServiceEditClient";

export const metadata = { title: "Edit service" };

export default async function ServiceEditPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  return <ServiceEditClient serviceId={serviceId} />;
}
