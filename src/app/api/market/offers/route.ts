import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ListingRow = { owner_id: string; status: string };
type ConversationRow = { id: string };
type OfferRow = { id: string; conversation_id: string; listing_id: string; buyer_id: string; seller_id: string; amount_cents: number; note: string | null; status: string; created_at: string; responded_at: string | null; completed_at: string | null };

async function findConversation(supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>, listingId: string, buyerId: string) {
  const { data, error } = await supabase
    .from("market_conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();
  return { conversation: data as ConversationRow | null, error };
}

async function findActiveOffer(supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>, conversationId: string, buyerId: string) {
  const { data } = await supabase
    .from("market_trade_offers")
    .select("id,conversation_id,listing_id,buyer_id,seller_id,amount_cents,note,status,created_at,responded_at,completed_at")
    .eq("conversation_id", conversationId)
    .eq("buyer_id", buyerId)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as OfferRow | null;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Offers are unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to make an offer." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { listingId?: unknown; amountCents?: unknown; note?: unknown } | null;
  const listingId = typeof payload?.listingId === "string" ? payload.listingId : "";
  const amountCents = typeof payload?.amountCents === "number" && Number.isInteger(payload.amountCents) ? payload.amountCents : 0;
  const note = typeof payload?.note === "string" ? payload.note.trim().slice(0, 500) : "";
  if (!listingId || amountCents < 0) return NextResponse.json({ error: "A valid listing and offer amount are required." }, { status: 400 });

  const { data: listing, error: listingError } = await supabase
    .from("market_listings")
    .select("owner_id,status")
    .eq("id", listingId)
    .maybeSingle();
  const listingRow = listing as ListingRow | null;
  if (listingError || !listingRow) return NextResponse.json({ error: "This listing is not available for offers." }, { status: 404 });
  if (listingRow.owner_id === user.id) return NextResponse.json({ error: "You cannot make an offer on your own listing." }, { status: 400 });
  if (listingRow.status === "sold") {
    return NextResponse.json({ error: "This listing has already been sold." }, { status: 409 });
  }
  if (!["published", "pending"].includes(listingRow.status)) {
    return NextResponse.json({ error: "This listing is not accepting offers right now." }, { status: 409 });
  }

  const { conversation: existingConversation, error: existingConversationError } = await findConversation(supabase, listingId, user.id);
  if (existingConversationError) {
    console.error("Unable to look up trade conversation", { code: existingConversationError.code, listingId, userId: user.id });
    return NextResponse.json({ error: "Unable to prepare this trade right now." }, { status: 500 });
  }

  let conversationId = existingConversation?.id ?? null;
  if (!conversationId) {
    const { data: conversation, error: conversationError } = await supabase
      .from("market_conversations")
      .insert({ listing_id: listingId, buyer_id: user.id, seller_id: listingRow.owner_id })
      .select("id")
      .single();
    if (conversationError || !conversation) {
      // A simultaneous Message or offer request can win the unique conversation insert.
      const { conversation: recoveredConversation } = await findConversation(supabase, listingId, user.id);
      if (!recoveredConversation) {
        console.error("Unable to create trade conversation", { code: conversationError?.code, listingId, userId: user.id });
        return NextResponse.json({ error: "Unable to open a trade conversation right now." }, { status: 500 });
      }
      conversationId = recoveredConversation.id;
    } else {
      conversationId = (conversation as ConversationRow).id;
    }
  }

  const { data: offer, error: offerError } = await supabase
    .from("market_trade_offers")
    .insert({ conversation_id: conversationId, listing_id: listingId, buyer_id: user.id, seller_id: listingRow.owner_id, amount_cents: amountCents, note: note || null })
    .select("id,conversation_id,listing_id,buyer_id,seller_id,amount_cents,note,status,created_at,responded_at,completed_at")
    .single();

  if (offerError || !offer) {
    if (offerError?.code === "23505") {
      const activeOffer = await findActiveOffer(supabase, conversationId, user.id);
      if (activeOffer) return NextResponse.json({ conversationId, offer: activeOffer, reusedActiveOffer: true });
    }
    const status = offerError?.code === "23505" ? 409 : offerError?.code === "42501" ? 403 : 500;
    const message = status === 409
      ? "There is already an active offer in this conversation."
      : status === 403
        ? "You cannot make an offer on this listing."
        : "Unable to make an offer right now.";
    console.error("Unable to create trade offer", { code: offerError?.code, conversationId, listingId, userId: user.id });
    return NextResponse.json({ error: message, conversationId }, { status });
  }

  return NextResponse.json({ conversationId, offer }, { status: 201 });
}
