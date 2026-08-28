import { notFound } from "next/navigation";
import { GroupBuyOrderClient } from "@/components/groupbuy/GroupBuyOrderClient";
import { GroupBuyShell } from "@/components/groupbuy/GroupBuyShell";
import { decodeGroupBuyBasket } from "@/lib/market/group-buy-basket";
import { findGroupBuy } from "@/data/groupBuy";

export const metadata = { title: "Group buy order | Tada" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function GroupBuyOrderRoute({ params, searchParams }: { params: Promise<{ groupBuyId: string }>; searchParams: Promise<SearchParams> }) {
  const { groupBuyId } = await params;
  const groupBuy = findGroupBuy(groupBuyId);
  if (!groupBuy) notFound();
  // The route owns the URL and hands the basket down already decoded. Reading
  // it with useSearchParams instead forces a Suspense boundary around the whole
  // form, and the boundary left the server HTML in the page without ever
  // hydrating it — every control in the form was inert.
  const { basket: rawBasket } = await searchParams;
  const basket = decodeGroupBuyBasket(typeof rawBasket === "string" ? rawBasket : undefined, groupBuy.items.map((item) => item.id));
  return <GroupBuyShell><GroupBuyOrderClient groupBuy={groupBuy} basket={basket} /></GroupBuyShell>;
}
