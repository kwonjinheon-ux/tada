import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ListingRow = { owner_id: string; status: string; bargain_type: string; price_cents: number };

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Offers are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to view offers." }, { status: 401 });
  const listingId = new URL(request.url).searchParams.get("listingId") ?? "";
  if (!listingId) return NextResponse.json({ error: "A valid listing is required." }, { status: 400 });

  const { data: offers, error } = await supabase
    .from("bargain_listing_offers")
    .select("id,buyer_id,amount_cents,note,status,created_at")
    .eq("listing_id", listingId)
    .eq("seller_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load offers right now." }, { status: 500 });
  return NextResponse.json({ offers: offers ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Offers are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to make an offer." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { listingId?: unknown; note?: unknown } | null;
  const listingId = typeof payload?.listingId === "string" ? payload.listingId : "";
  const note = typeof payload?.note === "string" ? payload.note.trim() : "";
  if (!listingId || note.length > 500) return NextResponse.json({ error: "Enter a valid offer." }, { status: 400 });

  const { data: listing } = await supabase.from("bargain_listings").select("owner_id,status,bargain_type,price_cents").eq("id", listingId).maybeSingle();
  const row = listing as ListingRow | null;
  if (!row || row.bargain_type !== "2-dollar-deals") return NextResponse.json({ error: "This listing is not accepting offers." }, { status: 404 });
  if (row.owner_id === user.id) return NextResponse.json({ error: "You cannot make an offer on your own listing." }, { status: 400 });
  if (!["published", "pending"].includes(row.status)) return NextResponse.json({ error: "This listing is no longer available." }, { status: 409 });

  const { data: offer, error } = await supabase
    .from("bargain_listing_offers")
    .insert({ listing_id: listingId, buyer_id: user.id, seller_id: row.owner_id, amount_cents: row.price_cents, note: note || null })
    .select("id,status,amount_cents,created_at")
    .single();
  if (error || !offer) {
    if (error?.code === "23505") return NextResponse.json({ error: "You already have a pending offer for this item." }, { status: 409 });
    return NextResponse.json({ error: error?.code === "42501" ? "You cannot make an offer for this item." : "Unable to send your offer right now." }, { status: error?.code === "42501" ? 403 : 500 });
  }
  return NextResponse.json({ offer }, { status: 201 });
}
