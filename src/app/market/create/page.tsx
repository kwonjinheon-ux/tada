import { PostAdPageClient } from "@/components/post-ad/PostAdPageClient";
import { isShopTypeValue } from "@/data/postShopTypes";

export const metadata = { title: "Create listing | Market" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MarketCreatePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { type } = await searchParams;
  // Coming back from the Group Buy form carries the type the seller picked, so
  // they land on it rather than on the default.
  return <PostAdPageClient initialShopType={isShopTypeValue(type) ? type : undefined} />;
}
