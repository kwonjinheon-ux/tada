import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type OfferRow = { id: string; listing_id: string; seller_id: string; status: string };

export async function PATCH(request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Offer responses are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to respond to this offer." }, { status: 401 });
  const { offerId } = await params;
  const payload = await request.json().catch(() => null) as { action?: unknown } | null;
  const action = payload?.action === "accept" || payload?.action === "decline" ? payload.action : null;
  if (!action) return NextResponse.json({ error: "Choose whether to accept or decline this offer." }, { status: 400 });

  const { data: offer } = await supabase.from("bargain_listing_offers").select("id,listing_id,seller_id,status").eq("id", offerId).maybeSingle();
  const row = offer as OfferRow | null;
  if (!row || row.seller_id !== user.id) return NextResponse.json({ error: "Only the seller can respond to this offer." }, { status: 403 });
  if (row.status !== "pending") return NextResponse.json({ error: "This offer has already been resolved." }, { status: 409 });

  const { error } = await supabase.from("bargain_listing_offers").update({ status: action === "accept" ? "accepted" : "declined" }).eq("id", offerId).eq("seller_id", user.id).eq("status", "pending");
  if (error) return NextResponse.json({ error: "Unable to update this offer right now." }, { status: 500 });
  if (action === "accept") {
    const { error: listingError } = await supabase.from("bargain_listings").update({ status: "sold" }).eq("id", row.listing_id).eq("owner_id", user.id).in("status", ["published", "pending"]);
    if (listingError) return NextResponse.json({ error: "Offer accepted, but the listing could not be marked as sold." }, { status: 500 });
    await supabase.from("bargain_listing_offers").update({ status: "declined" }).eq("listing_id", row.listing_id).eq("seller_id", user.id).eq("status", "pending").neq("id", offerId);
  }
  return NextResponse.json({ status: action === "accept" ? "accepted" : "declined" });
}
