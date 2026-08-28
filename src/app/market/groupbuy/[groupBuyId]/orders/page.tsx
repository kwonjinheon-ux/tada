import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { GroupBuySellerOrdersClient } from "@/components/groupbuy/GroupBuySellerOrdersClient";
import { GroupBuyShell } from "@/components/groupbuy/GroupBuyShell";
import type { GroupBuy } from "@/data/groupBuy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Group buy orders | Tada" };

export default async function GroupBuyOrdersRoute({ params }: { params: Promise<{ groupBuyId: string }> }) {
  const { groupBuyId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/market/groupbuy/${groupBuyId}/orders`);
  const { data: round } = await supabase.from("group_buys").select("*,group_buy_items(*)").eq("id", groupBuyId).eq("owner_id", user.id).maybeSingle();
  if (!round) notFound();
  const { data: orders, error } = await supabase.from("group_buy_orders").select("id,reference,buyer_name,buyer_email,buyer_phone,fulfilment,delivery_address,buyer_note,subtotal_cents,delivery_cents,total_cents,paid_at,created_at,group_buy_order_items(item_id,quantity,unit_price_cents,group_buy_items(name,unit_label))").eq("group_buy_id", groupBuyId).order("created_at", { ascending: true });
  if (error) notFound();
  const items = (round.group_buy_items ?? []).sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order);
  const groupBuy: GroupBuy = { id: round.id, title: round.title, summary: round.summary, description: round.description.split(/\n\n+/), status: round.status === "open" ? "open" : "closed", referencePrefix: round.reference_prefix, coverImage: "/images/home/journey-market.png", coverAlt: round.title, seller: { name: "Tada member", location: "New Zealand", phone: "", joinedLabel: "Tada group buy host" }, pickup: { available: round.pickup_available, address: round.pickup_address ?? "", window: round.pickup_window ?? "", note: round.pickup_note ?? "" }, delivery: { available: round.delivery_available, feeCents: round.delivery_fee_cents, freeOverCents: round.delivery_free_over_cents, areas: round.delivery_areas ?? [], note: "" }, closesLabel: round.closes_at, handoverLabel: round.handover_at, bank: { accountName: round.bank_account_name, accountNumber: round.bank_account_number }, minimumOrderCents: round.minimum_order_cents, participantCount: orders?.length ?? 0, items: items.map((item: { id: string; name: string; note: string; price_cents: number; unit_label: string; limit_per_person: number | null; photo_alt: string | null }) => ({ id: item.id, name: item.name, note: item.note, priceCents: item.price_cents, unitLabel: item.unit_label, limitPerPerson: item.limit_per_person, image: "/images/home/journey-market.png", imageAlt: item.photo_alt ?? item.name, orderedCount: 0 })) };
  return <GroupBuyShell><GroupBuySellerOrdersClient groupBuy={groupBuy} orders={(orders ?? []).map((order) => ({ ...order, group_buy_order_items: order.group_buy_order_items.map((line) => ({ ...line, group_buy_items: Array.isArray(line.group_buy_items) ? line.group_buy_items : line.group_buy_items ? [line.group_buy_items] : [] })) }))} /></GroupBuyShell>;
}
