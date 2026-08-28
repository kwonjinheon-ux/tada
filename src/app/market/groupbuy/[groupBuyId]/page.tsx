import { notFound } from "next/navigation";
import { GroupBuyDetailClient } from "@/components/groupbuy/GroupBuyDetailClient";
import { GroupBuyShell } from "@/components/groupbuy/GroupBuyShell";
import { findGroupBuy, groupBuys } from "@/data/groupBuy";

export function generateStaticParams() {
  return groupBuys.map((groupBuy) => ({ groupBuyId: groupBuy.id }));
}

export default async function GroupBuyDetailRoute({ params }: { params: Promise<{ groupBuyId: string }> }) {
  const { groupBuyId } = await params;
  const groupBuy = findGroupBuy(groupBuyId);
  if (!groupBuy) notFound();
  return <GroupBuyShell><GroupBuyDetailClient groupBuy={groupBuy} /></GroupBuyShell>;
}
