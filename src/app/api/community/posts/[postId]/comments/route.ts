import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function GET(_: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!isUuid(postId)) return NextResponse.json({ comments: [] });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Comments are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("community_post_comments").select("id,author_id,parent_id,depth,body,score,created_at,updated_at,deleted_at").eq("post_id", postId).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Unable to load comments right now." }, { status: 500 });
  const authorIds = [...new Set((data ?? []).map((comment) => comment.author_id))];
  const [{ data: profileData }, { data: voteData }] = await Promise.all([
    authorIds.length ? supabase.from("community_comment_profiles").select("id,display_name,avatar_path").in("id", authorIds) : Promise.resolve({ data: [] }),
    user && data?.length ? supabase.from("community_post_comment_votes").select("comment_id,value").eq("user_id", user.id).in("comment_id", data.map((comment) => comment.id)) : Promise.resolve({ data: [] }),
  ]);
  const avatarPaths = [...new Set((profileData ?? []).map((profile) => profile.avatar_path).filter((path): path is string => Boolean(path)))];
  const { data: signedAvatars } = avatarPaths.length ? await supabase.storage.from("profile-avatars").createSignedUrls(avatarPaths, 3600) : { data: [] };
  const avatarUrls = new Map((signedAvatars ?? []).filter((avatar) => avatar.path && avatar.signedUrl).map((avatar) => [avatar.path as string, avatar.signedUrl as string]));
  const profiles = new Map((profileData ?? []).map((profile) => [profile.id, profile]));
  const votes = new Map((voteData ?? []).map((vote) => [vote.comment_id, vote.value]));
  return NextResponse.json({ currentUserId: user?.id ?? null, comments: (data ?? []).map((comment) => { const profile = profiles.get(comment.author_id); return { id: comment.id, parentId: comment.parent_id, authorId: comment.author_id, authorName: profile?.display_name ?? "Tada member", authorAvatarUrl: profile?.avatar_path ? avatarUrls.get(profile.avatar_path) ?? null : null, depth: comment.depth, body: comment.body, score: comment.score, myVote: votes.get(comment.id) ?? 0, createdAt: comment.created_at, updatedAt: comment.updated_at, deletedAt: comment.deleted_at }; }) });
}

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!isUuid(postId)) return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  const payload = await request.json().catch(() => null) as { body?: unknown; parentId?: unknown } | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 2000) return NextResponse.json({ error: "Comments must be between 1 and 2,000 characters." }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Comments are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to post a comment." }, { status: 401 });
  const parentId = typeof payload?.parentId === "string" && isUuid(payload.parentId) ? payload.parentId : null;
  const { error } = await supabase.from("community_post_comments").insert({ post_id: postId, author_id: user.id, parent_id: parentId, body });
  if (error) return NextResponse.json({ error: "Unable to post your comment right now." }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
