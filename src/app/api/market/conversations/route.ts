import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ListingRow = { owner_id: string };

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Messaging is unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to message the seller." }, { status: 401 });

  const body = await request.json().catch(() => null) as { listingId?: unknown } | null;
  if (!body || typeof body.listingId !== "string") return NextResponse.json({ error: "A valid listing is required." }, { status: 400 });

  const { data: listing, error: listingError } = await supabase
    .from("market_listings")
    .select("owner_id")
    .eq("id", body.listingId)
    .maybeSingle();
  const sellerId = (listing as ListingRow | null)?.owner_id;
  if (listingError || !sellerId) return NextResponse.json({ error: "This listing is not available for messaging." }, { status: 404 });
  if (sellerId === user.id) return NextResponse.json({ error: "You cannot message yourself about this listing." }, { status: 400 });

  const { data: existing } = await supabase
    .from("market_conversations")
    .select("id")
    .eq("listing_id", body.listingId)
    .eq("buyer_id", user.id)
    .maybeSingle();
  if (existing?.id) return NextResponse.json({ conversationId: existing.id });

  const { data: conversation, error } = await supabase
    .from("market_conversations")
    .insert({ listing_id: body.listingId, buyer_id: user.id, seller_id: sellerId })
    .select("id")
    .single();

  if (error || !conversation) {
    const { data: duplicate } = await supabase
      .from("market_conversations")
      .select("id")
      .eq("listing_id", body.listingId)
      .eq("buyer_id", user.id)
      .maybeSingle();
    if (duplicate?.id) return NextResponse.json({ conversationId: duplicate.id });
    return NextResponse.json({ error: "Unable to open a conversation right now." }, { status: 500 });
  }

  return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
}
