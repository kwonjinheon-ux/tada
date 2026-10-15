import { ServiceProfileClient } from "@/components/services/ServiceProfileClient";
import { loadServiceProfile } from "@/lib/services/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Service profile | Tada" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ServiceProfilePage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const supabase = await createServerSupabaseClient();
  const initial = supabase ? await loadServiceProfile(supabase, serviceId) : null;
  return <ServiceProfileClient serviceId={serviceId} initial={initial} />;
}
