import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type OfferAction = "accept" | "decline" | "cancel" | "complete";

export async function PATCH(request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Offers are unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to update this offer." }, { status: 401 });

  const { offerId } = await params;
  const payload = await request.json().catch(() => null) as { action?: unknown } | null;
  const action = typeof payload?.action === "string" ? payload.action as OfferAction : null;
  if (!offerId || !action || !["accept", "decline", "cancel", "complete"].includes(action)) {
    return NextResponse.json({ error: "A valid offer action is required." }, { status: 400 });
  }

  const rpcName = action === "complete"
    ? "complete_market_trade_offer"
    : action === "cancel"
      ? "cancel_market_trade_offer"
      : "respond_market_trade_offer";
  const rpcArgs = action === "accept" || action === "decline"
    ? { p_offer_id: offerId, p_action: action }
    : { p_offer_id: offerId };

  const { data: offer, error } = await supabase.rpc(rpcName, rpcArgs);
  if (error || !offer) {
    const message = error?.message?.replace(/^ERROR:\s*/i, "") || "Unable to update this offer right now.";
    const status = error?.code === "P0001" || error?.code === "42501" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ offer });
}
