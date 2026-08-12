import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return new NextResponse(null, { status: 204 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 204 });
  const { postId } = await params;
  const { data: viewCount, error } = await supabase.rpc("record_community_post_view", { p_post_id: postId });
  if (error || viewCount === null) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ viewCount: Number(viewCount) });
}
