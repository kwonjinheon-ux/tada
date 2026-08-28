import { notFound } from "next/navigation";
import { GroupBuySellerOrdersClient } from "@/components/groupbuy/GroupBuySellerOrdersClient";
import { GroupBuyShell } from "@/components/groupbuy/GroupBuyShell";
import { findGroupBuy } from "@/data/groupBuy";

export const metadata = { title: "Group buy orders | Tada" };

export default async function GroupBuyOrdersRoute({ params }: { params: Promise<{ groupBuyId: string }> }) {
  const { groupBuyId } = await params;
  const groupBuy = findGroupBuy(groupBuyId);
  if (!groupBuy) notFound();
  return <GroupBuyShell><GroupBuySellerOrdersClient groupBuy={groupBuy} /></GroupBuyShell>;
}
