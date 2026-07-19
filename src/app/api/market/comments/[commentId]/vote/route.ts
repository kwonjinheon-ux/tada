import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PUT(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  if (!isUuid(commentId)) return NextResponse.json({ error: "Invalid comment." }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Comments are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to vote." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { value?: unknown } | null;
  const value = payload?.value;
  if (value !== -1 && value !== 0 && value !== 1) return NextResponse.json({ error: "Invalid vote." }, { status: 400 });

  const { error } = value === 0
    ? await supabase.from("market_listing_comment_votes").delete().eq("comment_id", commentId).eq("user_id", user.id)
    : await supabase.from("market_listing_comment_votes").upsert({ comment_id: commentId, user_id: user.id, value, updated_at: new Date().toISOString() }, { onConflict: "comment_id,user_id" });
  if (error) return NextResponse.json({ error: "Unable to record your vote." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
