import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return new NextResponse(null, { status: 204 });
  const { listingId } = await params;
  const { data: viewCount, error } = await supabase.rpc("record_market_listing_view", { p_listing_id: listingId });
  if (error || viewCount === null) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ viewCount: Number(viewCount) });
}
