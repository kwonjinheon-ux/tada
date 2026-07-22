import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type WishlistRequest = { listingId?: unknown };

async function getRequestContext(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: NextResponse.json({ error: "Wishlist is unavailable right now." }, { status: 503 }) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Please log in to save listings." }, { status: 401 }) };
  const body = await request.json().catch(() => null) as WishlistRequest | null;
  if (!body || typeof body.listingId !== "string") return { error: NextResponse.json({ error: "A valid listing is required." }, { status: 400 }) };
  return { supabase, user, listingId: body.listingId };
}

export async function POST(request: Request) {
  const context = await getRequestContext(request);
  if ("error" in context) return context.error;
  const { data: listing } = await context.supabase.from("market_listings").select("id,owner_id").eq("id", context.listingId).maybeSingle();
  if (!listing) return NextResponse.json({ error: "This listing is not available." }, { status: 404 });
  if (listing.owner_id === context.user.id) return NextResponse.json({ error: "You cannot save your own listing." }, { status: 400 });
  const { error } = await context.supabase.from("market_wishlist").upsert({ user_id: context.user.id, listing_id: context.listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "Unable to save this listing right now." }, { status: 500 });
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const context = await getRequestContext(request);
  if ("error" in context) return context.error;
  const { error } = await context.supabase.from("market_wishlist").delete().eq("user_id", context.user.id).eq("listing_id", context.listingId);
  if (error) return NextResponse.json({ error: "Unable to remove this listing right now." }, { status: 500 });
  return NextResponse.json({ saved: false });
}
