import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function GET(_: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!isUuid(postId)) return NextResponse.json({ comments: [] });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Comments are unavailable right now." }, { status: 503 });
  const { data, error } = await supabase.from("community_post_comments").select("id,author_id,body,created_at").eq("post_id", postId).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Unable to load comments right now." }, { status: 500 });
  return NextResponse.json({ comments: (data ?? []).map((comment) => ({ id: comment.id, authorId: comment.author_id, authorName: "Tada member", body: comment.body, createdAt: comment.created_at })) });
}

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!isUuid(postId)) return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  const payload = await request.json().catch(() => null) as { body?: unknown } | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 2000) return NextResponse.json({ error: "Comments must be between 1 and 2,000 characters." }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Comments are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to post a comment." }, { status: 401 });
  const { error } = await supabase.from("community_post_comments").insert({ post_id: postId, author_id: user.id, body });
  if (error) return NextResponse.json({ error: "Unable to post your comment right now." }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
