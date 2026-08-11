import { permanentRedirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

const bargainTypeDestinations: Record<string, string> = {
  "2-dollar-deals": "/market/2dollarshop",
  "5-dollar-deals": "/market/2dollarshop",
  "10-dollar-deals": "/market/2dollarshop",
  "moving-sale": "/market/moving-sales",
  "garage-sale": "/market/garage-sales",
};

export default async function BargainPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const bargain = typeof params.bargain === "string" ? params.bargain : undefined;
  permanentRedirect(bargainTypeDestinations[bargain ?? ""] ?? "/market");
}
