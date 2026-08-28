import { notFound } from "next/navigation";
import { GroupBuyDetailClient } from "@/components/groupbuy/GroupBuyDetailClient";
import { GroupBuyShell } from "@/components/groupbuy/GroupBuyShell";
import type { GroupBuy } from "@/data/groupBuy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

export default async function GroupBuyDetailRoute({ params }: { params: Promise<{ groupBuyId: string }> }) {
  const { groupBuyId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();
  const { data } = await supabase.from("group_buys").select("*,group_buy_items(*)").eq("id", groupBuyId).maybeSingle();
  if (!data) notFound();
  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("display_name,region_city,region_suburb")
    .eq("id", data.owner_id)
    .maybeSingle();
  const itemRows = (data.group_buy_items ?? []) as Array<{ id: string; name: string; note: string; price_cents: number; unit_label: string; limit_per_person: number | null; photo_path: string | null; photo_alt: string | null; display_order: number }>;
  const signedImages = await getSignedStorageImages("group-buy-images", itemRows.flatMap((item) => item.photo_path ? [item.photo_path] : []), "thumbnail");
  const millisecondsUntilClose = new Date(data.closes_at).getTime() - Date.now();
  const groupBuy: GroupBuy = {
    id: data.id, title: data.title, summary: data.summary, description: data.description.split(/\n\n+/).filter(Boolean),
    status: data.status !== "open" || millisecondsUntilClose <= 0 ? "closed" : millisecondsUntilClose < 24 * 60 * 60 * 1000 ? "closing-soon" : "open",
    referencePrefix: data.reference_prefix, coverImage: "/images/home/journey-market.png", coverAlt: data.title,
    seller: {
      name: sellerProfile?.display_name ?? "Tada member",
      location: [sellerProfile?.region_suburb, sellerProfile?.region_city].filter(Boolean).join(", ") || "New Zealand",
      phone: "",
      joinedLabel: "Tada group buy host",
    },
    pickup: { available: data.pickup_available, address: data.pickup_address ?? "", window: data.pickup_window ?? "", note: data.pickup_note ?? "" },
    delivery: { available: data.delivery_available, feeCents: data.delivery_fee_cents, freeOverCents: data.delivery_free_over_cents, areas: data.delivery_areas ?? [], note: "" },
    closesLabel: new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.closes_at)),
    handoverLabel: new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.handover_at)),
    bank: { accountName: data.bank_account_name, accountNumber: data.bank_account_number }, minimumOrderCents: data.minimum_order_cents,
    participantCount: 0,
    items: itemRows.sort((a, b) => a.display_order - b.display_order).map((item) => ({ id: item.id, name: item.name, note: item.note, priceCents: item.price_cents, unitLabel: item.unit_label, limitPerPerson: item.limit_per_person, image: item.photo_path ? signedImages.get(item.photo_path) ?? "/images/home/journey-market.png" : "/images/home/journey-market.png", imageAlt: item.photo_alt ?? item.name, orderedCount: 0 })),
  };
  if (!groupBuy) notFound();
  return <GroupBuyShell><GroupBuyDetailClient groupBuy={groupBuy} /></GroupBuyShell>;
}
