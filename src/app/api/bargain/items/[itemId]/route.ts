import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ItemRow = { id: string; listing_id: string; owner_id: string };

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Item editing is unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to edit this item." }, { status: 401 });
  const { itemId } = await params;
  const payload = await request.json().catch(() => null) as { listingId?: unknown; title?: unknown; description?: unknown; priceCents?: unknown } | null;
  const listingId = typeof payload?.listingId === "string" ? payload.listingId : "";
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const description = typeof payload?.description === "string" ? payload.description.trim() : "";
  const priceCents = typeof payload?.priceCents === "number" && Number.isInteger(payload.priceCents) ? payload.priceCents : -1;
  if (!listingId || !title || !description || priceCents < 0) return NextResponse.json({ error: "Enter a valid title, description, and price." }, { status: 400 });
  const { data: item } = await supabase.from("bargain_listing_items").select("id,listing_id,owner_id").eq("id", itemId).maybeSingle();
  const itemRow = item as ItemRow | null;
  if (!itemRow || itemRow.listing_id !== listingId) return NextResponse.json({ error: "This sale item could not be found." }, { status: 404 });
  if (itemRow.owner_id !== user.id) return NextResponse.json({ error: "Only the seller can edit this item." }, { status: 403 });
  const { data: updatedItem, error } = await supabase.from("bargain_listing_items").update({ title, description, price_cents: priceCents }).eq("id", itemId).eq("owner_id", user.id).select("id,title,description,price_cents").single();
  if (error || !updatedItem) return NextResponse.json({ error: "Unable to save this item right now." }, { status: 500 });
  return NextResponse.json({ item: updatedItem });
}
