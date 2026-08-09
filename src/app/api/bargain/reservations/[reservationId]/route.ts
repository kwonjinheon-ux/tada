import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ReservationRow = { id: string; listing_id: string; item_id: string; seller_id: string; status: string };

export async function PATCH(request: Request, { params }: { params: Promise<{ reservationId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Offer responses are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to respond to this offer." }, { status: 401 });
  const { reservationId } = await params;
  const payload = await request.json().catch(() => null) as { action?: unknown } | null;
  const action = payload?.action === "accept" || payload?.action === "decline" ? payload.action : null;
  if (!action) return NextResponse.json({ error: "Choose whether to accept or decline this offer." }, { status: 400 });
  const { data: reservation } = await supabase.from("bargain_item_reservations").select("id,listing_id,item_id,seller_id,status").eq("id", reservationId).maybeSingle();
  const row = reservation as ReservationRow | null;
  if (!row || row.seller_id !== user.id) return NextResponse.json({ error: "Only the seller can respond to this offer." }, { status: 403 });
  if (row.status !== "pending") return NextResponse.json({ error: "This offer has already been resolved." }, { status: 409 });
  const { error: reservationError } = await supabase.from("bargain_item_reservations").update({ status: action === "accept" ? "accepted" : "declined" }).eq("id", reservationId).eq("seller_id", user.id).eq("status", "pending");
  if (reservationError) return NextResponse.json({ error: "Unable to update this offer right now." }, { status: 500 });
  if (action === "accept") {
    const { error: itemError } = await supabase.from("bargain_listing_items").update({ status: "sold" }).eq("id", row.item_id).eq("listing_id", row.listing_id).eq("owner_id", user.id).eq("status", "available");
    if (itemError) return NextResponse.json({ error: "Offer accepted, but the item could not be marked as sold." }, { status: 500 });
    await supabase.from("bargain_item_reservations").update({ status: "declined" }).eq("item_id", row.item_id).eq("status", "pending").neq("id", reservationId).eq("seller_id", user.id);
  }
  return NextResponse.json({ status: action === "accept" ? "accepted" : "declined" });
}
