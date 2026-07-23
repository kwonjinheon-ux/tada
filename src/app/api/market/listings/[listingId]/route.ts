import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Listing management is unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to delete a listing." }, { status: 401 });

  const { listingId } = await params;
  const { data: listing } = await supabase.from("market_listings").select("id,owner_id").eq("id", listingId).maybeSingle();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (listing.owner_id !== user.id) return NextResponse.json({ error: "You can only delete your own listings." }, { status: 403 });

  const { data: photos } = await supabase.from("market_listing_photos").select("storage_path").eq("listing_id", listingId);
  const paths = (photos ?? []).map((photo) => photo.storage_path).filter((path): path is string => Boolean(path));
  const { error: deleteError } = await supabase.from("market_listings").delete().eq("id", listingId).eq("owner_id", user.id);
  if (deleteError) return NextResponse.json({ error: "Unable to delete this listing right now." }, { status: 500 });

  if (paths.length) await supabase.storage.from("market-listing-images").remove(paths);
  return NextResponse.json({ deleted: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Listing management is unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to edit a listing." }, { status: 401 });

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const description = typeof payload?.description === "string" ? payload.description.trim() : "";
  const priceCents = typeof payload?.priceCents === "number" ? payload.priceCents : NaN;
  const itemCondition = payload?.itemCondition;
  const tradeMethod = payload?.tradeMethod;
  const validConditions = new Set(["brand_new", "like_new", "good", "fair"]);
  const validTradeMethods = new Set(["pickup_delivery", "pickup", "delivery"]);
  if (title.length < 2 || title.length > 120) return NextResponse.json({ error: "Title must be between 2 and 120 characters." }, { status: 400 });
  if (description.length < 20 || description.length > 5000) return NextResponse.json({ error: "Description must be between 20 and 5,000 characters." }, { status: 400 });
  if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 100_000_000) return NextResponse.json({ error: "Enter a valid price." }, { status: 400 });
  if (!validConditions.has(String(itemCondition)) || !validTradeMethods.has(String(tradeMethod))) return NextResponse.json({ error: "Choose valid listing details." }, { status: 400 });

  const { listingId } = await params;
  const { data: listing, error } = await supabase
    .from("market_listings")
    .update({ title, description, price_cents: priceCents, item_condition: itemCondition, trade_method: tradeMethod })
    .eq("id", listingId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !listing) return NextResponse.json({ error: "Unable to update this listing right now." }, { status: 403 });
  return NextResponse.json({ listingId: listing.id });
}
