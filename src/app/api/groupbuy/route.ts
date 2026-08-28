import { groupBuyCreateRequestSchema } from "@/contracts/api";
import type { GroupBuy } from "@/data/groupBuy";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createBearerSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImage } from "@/lib/supabase/storage-image";

const fallbackImage = "/images/home/journey-market.png";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

async function toGroupBuyCard(row: {
  id: string;
  title: string;
  summary: string;
  status: "open" | "closed" | "cancelled";
  closes_at: string;
  handover_at: string;
  pickup_available: boolean;
  delivery_available: boolean;
  delivery_fee_cents: number;
  cover_image_path: string | null;
  cover_image_alt: string | null;
  group_buy_items: Array<{ id: string; name: string; note: string; price_cents: number; unit_label: string; limit_per_person: number | null; photo_path: string | null; photo_alt: string | null; display_order: number }>;
}): Promise<GroupBuy> {
  const millisecondsUntilClose = new Date(row.closes_at).getTime() - Date.now();
  const isClosed = row.status === "closed" || row.status === "cancelled" || millisecondsUntilClose <= 0;
  const isClosingSoon = !isClosed && millisecondsUntilClose < 24 * 60 * 60 * 1000;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    description: [],
    status: isClosed ? "closed" : isClosingSoon ? "closing-soon" : "open",
    referencePrefix: "GB",
    coverImage: (row.cover_image_path ?? [...row.group_buy_items].sort((a, b) => a.display_order - b.display_order).find((item) => item.photo_path)?.photo_path) ? await getSignedStorageImage("group-buy-images", row.cover_image_path ?? [...row.group_buy_items].sort((a, b) => a.display_order - b.display_order).find((item) => item.photo_path)?.photo_path ?? "", "card") ?? fallbackImage : fallbackImage,
    coverAlt: row.cover_image_alt ?? [...row.group_buy_items].sort((a, b) => a.display_order - b.display_order).find((item) => item.photo_path)?.photo_alt ?? row.title,
    seller: { name: "Tada member", location: "Hamilton", phone: "", joinedLabel: "Tada group buy host" },
    pickup: { available: row.pickup_available, address: "", window: "", note: "" },
    delivery: { available: row.delivery_available, feeCents: row.delivery_fee_cents, freeOverCents: null, areas: [], note: "" },
    closesLabel: formatDate(row.closes_at),
    handoverLabel: formatDate(row.handover_at),
    bank: { accountName: "", accountNumber: "" },
    minimumOrderCents: null,
    participantCount: 0,
    items: row.group_buy_items.map((item) => ({
      id: item.id,
      name: item.name,
      note: item.note,
      priceCents: item.price_cents,
      unitLabel: item.unit_label,
      limitPerPerson: item.limit_per_person,
      image: fallbackImage,
      imageAlt: item.photo_alt ?? item.name,
      orderedCount: 0,
    })),
  };
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Group buys are unavailable right now.", 503);
  const { data, error } = await supabase
    .from("group_buys")
    .select("id,title,summary,status,closes_at,handover_at,pickup_available,delivery_available,delivery_fee_cents,cover_image_path,cover_image_alt,group_buy_items(id,name,note,price_cents,unit_label,limit_per_person,photo_path,photo_alt,display_order)")
    .order("created_at", { ascending: false });
  if (error) return apiFailure("INTERNAL", "Unable to load group buys.", 500);
  return apiSuccess(await Promise.all((data ?? []).filter((row) => row.group_buy_items.length > 0).map(toGroupBuyCard)));
}

export async function POST(request: Request) {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  const supabase = accessToken ? createBearerSupabaseClient(accessToken) : await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Group buys are unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser(accessToken ?? undefined);
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in to start a group buy.", 401);
  const parsed = groupBuyCreateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiFailure("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid group buy.", 400);
  const data = parsed.data;
  if ((data.coverImagePath && !data.coverImagePath.startsWith(`${user.id}/group-buy/`)) || data.items.some((item) => item.photoPath && !item.photoPath.startsWith(`${user.id}/group-buy/`))) {
    return apiFailure("BAD_REQUEST", "Uploaded images must belong to your account.", 400);
  }
  const { data: groupBuy, error } = await supabase.from("group_buys").insert({
    owner_id: user.id, title: data.title, cover_image_path: data.coverImagePath, cover_image_alt: data.coverImageAlt || null, summary: data.summary, description: data.description, reference_prefix: data.referencePrefix,
    closes_at: data.closesAt, handover_at: data.handoverAt, pickup_available: data.pickup.available, pickup_address: data.pickup.available ? data.pickup.address : null,
    pickup_window: data.pickup.available ? data.pickup.window : null, pickup_note: data.pickup.available ? data.pickup.note || null : null,
    delivery_available: data.delivery.available, delivery_fee_cents: data.delivery.available ? data.delivery.feeCents : 0,
    delivery_free_over_cents: data.delivery.available ? data.delivery.freeOverCents : null, delivery_areas: data.delivery.available ? data.delivery.areas : [],
    bank_account_name: data.bank.accountName, bank_account_number: data.bank.accountNumber, minimum_order_cents: data.minimumOrderCents,
  }).select("id").single();
  if (error || !groupBuy) {
    console.error("Unable to create group buy", error);
    return apiFailure("INTERNAL", "Unable to create this group buy. Please check your profile and try again.", 500);
  }
  const { error: itemError } = await supabase.from("group_buy_items").insert(data.items.map((item, display_order) => ({
    group_buy_id: groupBuy.id, name: item.name, note: item.note, price_cents: item.priceCents, unit_label: item.unitLabel,
    limit_per_person: item.limitPerPerson, photo_path: item.photoPath, photo_alt: item.photoAlt || null, display_order,
  })));
  if (itemError) {
    await supabase.from("group_buys").delete().eq("id", groupBuy.id).eq("owner_id", user.id);
    console.error("Unable to create group buy items", itemError);
    return apiFailure("INTERNAL", "Unable to save group buy items.", 500);
  }
  return apiSuccess({ id: groupBuy.id }, { status: 201 });
}
