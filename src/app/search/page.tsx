import { GlobalSearchResults } from "@/components/search/GlobalSearchResults";
import { PageContainer } from "@/components/layout/PageContainer";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";

  return <main className="global-search-page"><PageContainer><GlobalSearchResults query={query} /></PageContainer></main>;
}
