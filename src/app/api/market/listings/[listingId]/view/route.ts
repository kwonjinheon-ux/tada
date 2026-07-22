import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return new NextResponse(null, { status: 204 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 204 });
  const { listingId } = await params;
  const { data: listing } = await supabase.from("market_listings").select("id").eq("id", listingId).maybeSingle();
  if (!listing) return new NextResponse(null, { status: 204 });
  await supabase.from("market_listing_views").upsert({ user_id: user.id, listing_id: listingId, last_viewed_at: new Date().toISOString() }, { onConflict: "user_id,listing_id" });
  return new NextResponse(null, { status: 204 });
}
