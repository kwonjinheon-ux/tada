import { notFound } from "next/navigation";
import { GroupBuyOrderClient } from "@/components/groupbuy/GroupBuyOrderClient";
import { GroupBuyShell } from "@/components/groupbuy/GroupBuyShell";
import { decodeGroupBuyBasket } from "@/lib/market/group-buy-basket";
import type { GroupBuy } from "@/data/groupBuy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Group buy order | Tada" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function GroupBuyOrderRoute({ params, searchParams }: { params: Promise<{ groupBuyId: string }>; searchParams: Promise<SearchParams> }) {
  const { groupBuyId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();
  const { data } = await supabase.from("group_buys").select("*,group_buy_items(*)").eq("id", groupBuyId).maybeSingle();
  if (!data) notFound();
  const rows = (data.group_buy_items ?? []).sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order);
  const groupBuy: GroupBuy = { id: data.id, title: data.title, summary: data.summary, description: data.description.split(/\n\n+/), status: data.status === "open" ? "open" : "closed", referencePrefix: data.reference_prefix, coverImage: "/images/home/journey-market.png", coverAlt: data.title, seller: { name: "Tada member", location: "New Zealand", phone: "", joinedLabel: "Tada group buy host" }, pickup: { available: data.pickup_available, address: data.pickup_address ?? "", window: data.pickup_window ?? "", note: data.pickup_note ?? "" }, delivery: { available: data.delivery_available, feeCents: data.delivery_fee_cents, freeOverCents: data.delivery_free_over_cents, areas: data.delivery_areas ?? [], note: "" }, closesLabel: data.closes_at, handoverLabel: data.handover_at, bank: { accountName: data.bank_account_name, accountNumber: data.bank_account_number }, minimumOrderCents: data.minimum_order_cents, participantCount: 0, items: rows.map((item: { id: string; name: string; note: string; price_cents: number; unit_label: string; limit_per_person: number | null; photo_alt: string | null }) => ({ id: item.id, name: item.name, note: item.note, priceCents: item.price_cents, unitLabel: item.unit_label, limitPerPerson: item.limit_per_person, image: "/images/home/journey-market.png", imageAlt: item.photo_alt ?? item.name, orderedCount: 0 })) };
  // The route owns the URL and hands the basket down already decoded. Reading
  // it with useSearchParams instead forces a Suspense boundary around the whole
  // form, and the boundary left the server HTML in the page without ever
  // hydrating it — every control in the form was inert.
  const { basket: rawBasket } = await searchParams;
  const basket = decodeGroupBuyBasket(typeof rawBasket === "string" ? rawBasket : undefined, groupBuy.items.map((item) => item.id));
  return <GroupBuyShell><GroupBuyOrderClient groupBuy={groupBuy} basket={basket} /></GroupBuyShell>;
}
