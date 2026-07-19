import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getClient(commentId: string) {
  if (!isUuid(commentId)) return { response: NextResponse.json({ error: "Invalid comment." }, { status: 400 }) };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { response: NextResponse.json({ error: "Comments are unavailable right now." }, { status: 503 }) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Please log in to continue." }, { status: 401 }) };
  return { supabase, user };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const result = await getClient(commentId);
  if ("response" in result) return result.response;
  const payload = await request.json().catch(() => null) as { body?: unknown } | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 2000) return NextResponse.json({ error: "Comments must be between 1 and 2,000 characters." }, { status: 400 });

  const { error } = await result.supabase
    .from("market_listing_comments")
    .update({ body, updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("author_id", result.user.id);
  if (error) return NextResponse.json({ error: "Unable to update this comment." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const result = await getClient(commentId);
  if ("response" in result) return result.response;
  const { error } = await result.supabase
    .from("market_listing_comments")
    .update({ body: "Comment deleted", deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("author_id", result.user.id);
  if (error) return NextResponse.json({ error: "Unable to delete this comment." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
