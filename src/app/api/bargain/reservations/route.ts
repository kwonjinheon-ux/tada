import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ListingRow = { owner_id: string; status: string };
type ItemRow = { id: string; listing_id: string; owner_id: string; price_cents: number };

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Reservations are unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to reserve an item." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { listingId?: unknown; itemId?: unknown } | null;
  const listingId = typeof payload?.listingId === "string" ? payload.listingId : "";
  const itemId = typeof payload?.itemId === "string" ? payload.itemId : "";
  if (!listingId || !itemId) return NextResponse.json({ error: "A valid sale item is required." }, { status: 400 });

  const [{ data: listing }, { data: item }] = await Promise.all([
    supabase.from("bargain_listings").select("owner_id,status").eq("id", listingId).maybeSingle(),
    supabase.from("bargain_listing_items").select("id,listing_id,owner_id,price_cents").eq("id", itemId).maybeSingle(),
  ]);
  const listingRow = listing as ListingRow | null;
  const itemRow = item as ItemRow | null;
  if (!listingRow || !itemRow || itemRow.listing_id !== listingId || itemRow.owner_id !== listingRow.owner_id) return NextResponse.json({ error: "This sale item is no longer available." }, { status: 404 });
  if (listingRow.owner_id === user.id) return NextResponse.json({ error: "You cannot reserve your own item." }, { status: 400 });
  if (!['published', 'pending'].includes(listingRow.status)) return NextResponse.json({ error: "This sale is not accepting reservations right now." }, { status: 409 });

  const { data: reservation, error } = await supabase
    .from("bargain_item_reservations")
    .insert({ listing_id: listingId, item_id: itemId, buyer_id: user.id, seller_id: listingRow.owner_id, amount_cents: itemRow.price_cents })
    .select("id,status,amount_cents,created_at")
    .single();
  if (error || !reservation) {
    if (error?.code === "23505") {
      const { data: existing } = await supabase.from("bargain_item_reservations").select("id,status,amount_cents,created_at").eq("item_id", itemId).eq("buyer_id", user.id).eq("status", "pending").maybeSingle();
      if (existing) return NextResponse.json({ reservation: existing, reusedActiveReservation: true });
    }
    console.error("Unable to create bargain reservation", { code: error?.code, listingId, itemId, userId: user.id });
    return NextResponse.json({ error: error?.code === "42501" ? "You cannot reserve this item." : "Unable to send your reservation offer right now." }, { status: error?.code === "42501" ? 403 : 500 });
  }
  return NextResponse.json({ reservation }, { status: 201 });
}
