import { GlobalSearchResults } from "@/components/search/GlobalSearchResults";
import { CommunityDesktopLayout } from "@/components/community/CommunityDesktopLayout";
import { PageContainer } from "@/components/layout/PageContainer";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; scope?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";
  const isCommunitySearch =
    typeof params.scope === "string" && params.scope === "community";
  const results = <GlobalSearchResults query={query} />;

  if (isCommunitySearch) {
    return <CommunityDesktopLayout>{results}</CommunityDesktopLayout>;
  }

  return <main className="global-search-page"><PageContainer>{results}</PageContainer></main>;
}
