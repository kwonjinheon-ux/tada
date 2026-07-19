import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CommentRow = {
  id: string;
  listing_id: string;
  author_id: string;
  parent_id: string | null;
  depth: number;
  body: string;
  score: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CommentProfileRow = { id: string; display_name: string; avatar_path: string | null };
type VoteRow = { comment_id: string; value: number };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  if (!isUuid(listingId)) return NextResponse.json({ error: "Invalid listing." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Comments are unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("market_listing_comments")
    .select("id,listing_id,author_id,parent_id,depth,body,score,created_at,updated_at,deleted_at")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Unable to load comments right now." }, { status: 500 });
  const comments = (data ?? []) as CommentRow[];
  const authorIds = [...new Set(comments.map((comment) => comment.author_id))];
  const [{ data: profileData }, { data: voteData }] = await Promise.all([
    authorIds.length
      ? supabase.from("market_comment_profiles").select("id,display_name,avatar_path").in("id", authorIds)
      : Promise.resolve({ data: [] }),
    user && comments.length
      ? supabase.from("market_listing_comment_votes").select("comment_id,value").eq("user_id", user.id).in("comment_id", comments.map((comment) => comment.id))
      : Promise.resolve({ data: [] }),
  ]);
  const profiles = new Map(((profileData ?? []) as CommentProfileRow[]).map((profile) => [profile.id, profile]));
  const avatarPaths = [...new Set((profileData ?? [] as CommentProfileRow[]).map((profile) => profile.avatar_path).filter((path): path is string => Boolean(path)))];
  const { data: signedAvatars } = avatarPaths.length
    ? await supabase.storage.from("profile-avatars").createSignedUrls(avatarPaths, 3600)
    : { data: [] };
  const avatarUrls = new Map((signedAvatars ?? []).filter((avatar) => avatar.path && avatar.signedUrl).map((avatar) => [avatar.path as string, avatar.signedUrl as string]));
  const votes = new Map(((voteData ?? []) as VoteRow[]).map((vote) => [vote.comment_id, vote.value]));

  return NextResponse.json({
    currentUserId: user?.id ?? null,
    comments: comments.map((comment) => {
      const profile = profiles.get(comment.author_id);
      return {
        id: comment.id,
        parentId: comment.parent_id,
        authorId: comment.author_id,
        authorName: profile?.display_name || "Tada member",
        authorAvatarUrl: profile?.avatar_path ? avatarUrls.get(profile.avatar_path) ?? null : null,
        depth: comment.depth,
        body: comment.body,
        score: comment.score,
        myVote: votes.get(comment.id) ?? 0,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        deletedAt: comment.deleted_at,
      };
    }),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  if (!isUuid(listingId)) return NextResponse.json({ error: "Invalid listing." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Comments are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to post a comment." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { body?: unknown; parentId?: unknown } | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const parentId = typeof payload?.parentId === "string" ? payload.parentId : null;
  if (!body || body.length > 2000) return NextResponse.json({ error: "Comments must be between 1 and 2,000 characters." }, { status: 400 });
  if (parentId && !isUuid(parentId)) return NextResponse.json({ error: "Invalid reply target." }, { status: 400 });

  const { error } = await supabase.from("market_listing_comments").insert({
    listing_id: listingId,
    author_id: user.id,
    parent_id: parentId,
    body,
  });
  if (error) return NextResponse.json({ error: error.message.includes("three levels") ? "Replies can be nested up to three levels." : "Unable to post your comment right now." }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
