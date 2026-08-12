import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PUT(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const payload = await request.json().catch(() => null) as { action?: unknown; value?: unknown } | null;
  if (payload?.action !== "vote" || (payload.value !== -1 && payload.value !== 0 && payload.value !== 1)) return NextResponse.json({ error: "Invalid engagement." }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Community posts are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to vote." }, { status: 401 });
  const { postId } = await params;
  const { data, error } = await supabase.rpc("cast_community_post_vote", { p_post_id: postId, p_value: payload.value });
  const result = Array.isArray(data) ? data[0] : data;
  if (error || !result) return NextResponse.json({ error: "Unable to record your vote." }, { status: 400 });
  return NextResponse.json({ score: Number(result.score), myVote: Number(result.my_vote) });
}

export async function POST(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Community posts are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to share." }, { status: 401 });
  const { postId } = await params;
  const { data: shareCount, error } = await supabase.rpc("record_community_post_share", { p_post_id: postId });
  if (error || shareCount === null) return NextResponse.json({ error: "Unable to record your share." }, { status: 400 });
  return NextResponse.json({ shareCount: Number(shareCount) });
}
