import { communityWishlistRequestSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Saved posts are unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiSuccess({ saved: false });
  const postId = new URL(request.url).searchParams.get("postId");
  if (!communityWishlistRequestSchema.safeParse({ postId }).success) return apiFailure("BAD_REQUEST", "A valid post is required.", 400);
  const { data } = await supabase.from("community_wishlist").select("post_id").eq("user_id", user.id).eq("post_id", postId).maybeSingle();
  return apiSuccess({ saved: Boolean(data) });
}

async function getRequestContext(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: apiFailure("UNAVAILABLE", "Saved posts are unavailable right now.", 503) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: apiFailure("UNAUTHORIZED", "Please log in to save posts.", 401) };
  const parsed = communityWishlistRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return { error: apiFailure("BAD_REQUEST", "A valid post is required.", 400) };
  return { supabase, user, postId: parsed.data.postId };
}

export async function POST(request: Request) {
  const context = await getRequestContext(request);
  if ("error" in context) return context.error;
  const { data: post } = await context.supabase.from("community_posts").select("id,author_id").eq("id", context.postId).eq("status", "published").maybeSingle();
  if (!post) return apiFailure("NOT_FOUND", "This post is not available.", 404);
  if (post.author_id === context.user.id) return apiFailure("BAD_REQUEST", "You cannot save your own post.", 400);
  const { error } = await context.supabase.from("community_wishlist").upsert({ user_id: context.user.id, post_id: context.postId }, { onConflict: "user_id,post_id", ignoreDuplicates: true });
  if (error) return apiFailure("INTERNAL", "Unable to save this post right now.", 500);
  return apiSuccess({ saved: true });
}

export async function DELETE(request: Request) {
  const context = await getRequestContext(request);
  if ("error" in context) return context.error;
  const { error } = await context.supabase.from("community_wishlist").delete().eq("user_id", context.user.id).eq("post_id", context.postId);
  if (error) return apiFailure("INTERNAL", "Unable to remove this post right now.", 500);
  return apiSuccess({ saved: false });
}
