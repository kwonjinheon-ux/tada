import { ServicesPageClient } from "@/components/services/ServicesPageClient";
import { loadServicesFeed } from "@/lib/services/feed";
import { resolveProfileAreaDefault } from "@/lib/market/starting-area";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Services | Tada" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export default async function ServicesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const rawParams = await searchParams;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <ServicesPageClient />;
  // An address with no area is a fresh visit, which starts on the profile's area.
  const { profileLocationDefault } = await resolveProfileAreaDefault(supabase, rawParams);
  const query = {
    category: single(rawParams.category) ?? null,
    mainLocation: single(rawParams.mainLocation) ?? (profileLocationDefault || null),
    subLocation: single(rawParams.subLocation) ?? null,
  };
  const feed = await loadServicesFeed(supabase, query);
  return <ServicesPageClient initialFeed={feed} initialQuery={query} profileLocationDefault={profileLocationDefault} />;
}
