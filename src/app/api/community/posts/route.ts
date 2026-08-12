import { communityPostCreateRequestSchema, communityPostCategorySchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

const postTypeByCategory = {
  "local-noticeboard": "notice",
  events: "event",
  qna: "question",
  recommendations: "recommendation",
  "free-stuff": "free",
  "lost-found": "notice",
  "parents-kids": "notice",
  "jobs-services": "notice",
  "housing-flatmates": "housing",
  "study-language": "question",
  "clubs-meetups": "event",
} as const;

const relativeTime = (createdAt: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Community posts are unavailable right now.", 503);

  const url = new URL(request.url);
  const category = communityPostCategorySchema.safeParse(url.searchParams.get("category"));
  if (url.searchParams.has("category") && !category.success) return apiFailure("BAD_REQUEST", "Invalid community category.", 400);

  let query = supabase.from("community_posts").select("id, author_id, post_type, title, body, region_city, region_suburb, created_at").eq("status", "published").order("created_at", { ascending: false }).limit(40);
  if (category.success) query = query.eq("category_slug", category.data);
  const mainLocation = url.searchParams.get("mainLocation")?.trim();
  const subLocation = url.searchParams.get("subLocation")?.trim();
  if (mainLocation) query = query.eq("region_city", mainLocation);
  if (subLocation) query = query.eq("region_suburb", subLocation);

  const { data, error } = await query;
  if (error) return apiFailure("INTERNAL", "We couldn't load community posts.", 500);
  const postIds = (data ?? []).map((post) => post.id);
  const { data: imageRows } = postIds.length ? await supabase.from("community_post_images").select("post_id,storage_path,display_order").in("post_id", postIds).order("display_order") : { data: [] };
  const { data: commentRows } = postIds.length ? await supabase.from("community_post_comments").select("post_id").in("post_id", postIds).is("deleted_at", null) : { data: [] };
  const paths = (imageRows ?? []).map((image) => image.storage_path);
  const signed = await getSignedStorageImages("community-post-images", paths, "gallery");
  const authorIds = [...new Set((data ?? []).map((post) => post.author_id))];
  const { data: authors } = authorIds.length ? await supabase.from("community_comment_profiles").select("id,display_name,avatar_path").in("id", authorIds) : { data: [] };
  const avatarPaths = [...new Set((authors ?? []).map((author) => author.avatar_path).filter((path): path is string => Boolean(path)))];
  const { data: signedAvatars } = avatarPaths.length ? await supabase.storage.from("profile-avatars").createSignedUrls(avatarPaths, 3600) : { data: [] };
  const avatars = new Map((signedAvatars ?? []).filter((avatar) => avatar.path && avatar.signedUrl).map((avatar) => [avatar.path as string, avatar.signedUrl as string]));
  const authorsById = new Map((authors ?? []).map((author) => [author.id, author]));
  const commentCounts = new Map<string, number>();
  for (const comment of commentRows ?? []) commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1);
  const imagesByPost = new Map<string, { src: string; alt: string }[]>();
  for (const image of imageRows ?? []) {
    const src = signed.get(image.storage_path);
    if (src) imagesByPost.set(image.post_id, [...(imagesByPost.get(image.post_id) ?? []), { src, alt: "Community post image" }]);
  }
  return apiSuccess({
    posts: (data ?? []).map((post) => ({
      id: post.id,
      type: post.post_type,
      title: post.title,
      excerpt: post.body,
      location: [post.region_suburb, post.region_city].filter(Boolean).join(", "),
      timeAgo: relativeTime(post.created_at),
      images: imagesByPost.get(post.id) ?? [],
      responseCount: commentCounts.get(post.id) ?? 0,
      authorName: authorsById.get(post.author_id)?.display_name ?? "Community member",
      authorAvatarUrl: authorsById.get(post.author_id)?.avatar_path ? avatars.get(authorsById.get(post.author_id)?.avatar_path ?? "") ?? null : null,
    })),
  });
}

export async function POST(request: Request) {
  const payload = communityPostCreateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success || payload.data.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length < 20) return apiFailure("BAD_REQUEST", "Please complete each required field.", 400);

  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Community posting is unavailable right now.", 503);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Sign in to create a community post.", 401);

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      author_id: user.id,
      category_slug: payload.data.categorySlug,
      post_type: postTypeByCategory[payload.data.categorySlug],
      title: payload.data.title,
      body: payload.data.body,
      region_city: payload.data.mainLocation,
      region_suburb: payload.data.subLocation || null,
    })
    .select("id")
    .single();

  if (error || !data) return apiFailure("INTERNAL", "We couldn't publish your post. Please try again.", 500);
  if (payload.data.imagePaths.length) {
    const { error: imageError } = await supabase.from("community_post_images").insert(payload.data.imagePaths.map((storage_path, display_order) => ({ post_id: data.id, owner_id: user.id, storage_path, display_order })));
    if (imageError) return apiFailure("INTERNAL", "Your post was published, but its images could not be attached.", 500);
  }
  return apiSuccess({ id: data.id }, { status: 201 });
}
