import { NextResponse } from "next/server";
import { bargainPickupReservationRequestSchema } from "@/contracts/api";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Reservations are unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to reserve an item." }, { status: 401 });

  const parsed = bargainPickupReservationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a future 30-minute pickup time." }, { status: 400 });
  const { listingId, itemId, pickupStartAt, pickupEndAt } = parsed.data;
  const { data: reservation, error } = await supabase.rpc("manage_bargain_pickup_reservation", {
    p_action: "request",
    p_listing_id: listingId,
    p_item_id: itemId,
    p_pickup_start_at: pickupStartAt,
    p_pickup_end_at: pickupEndAt,
  });
  if (error || !reservation) {
    console.error("Unable to create bargain pickup commitment", { code: error?.code, listingId, itemId, userId: user.id });
    const status = error?.code === "42501" ? 403 : error?.code === "23505" ? 409 : error?.code === "22023" ? 400 : 500;
    return NextResponse.json({ error: error?.message ?? "Unable to send your pickup request right now." }, { status });
  }
  return NextResponse.json({ reservation }, { status: 201 });
}
