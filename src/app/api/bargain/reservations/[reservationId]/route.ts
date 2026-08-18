import { NextResponse } from "next/server";
import { bargainPickupReservationActionSchema } from "@/contracts/api";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ reservationId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Offer responses are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to respond to this offer." }, { status: 401 });
  const { reservationId } = await params;
  const parsed = bargainPickupReservationActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid pickup action." }, { status: 400 });
  const { data: reservation, error } = await supabase.rpc("manage_bargain_pickup_reservation", {
    p_action: parsed.data.action,
    p_reservation_id: reservationId,
  });
  if (error || !reservation) {
    console.error("Unable to update bargain pickup commitment", { code: error?.code, reservationId, userId: user.id });
    const status = error?.code === "42501" ? 403 : error?.code === "P0002" ? 404 : error?.code === "22023" ? 400 : error?.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error?.message ?? "Unable to update this pickup commitment right now." }, { status });
  }
  return NextResponse.json({ reservation });
}
