import { communityPostCreateRequestSchema, communityPostCategorySchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  let query = supabase.from("community_posts").select("id, post_type, title, body, region_city, region_suburb, created_at").eq("status", "published").order("created_at", { ascending: false }).limit(40);
  if (category.success) query = query.eq("category_slug", category.data);
  const mainLocation = url.searchParams.get("mainLocation")?.trim();
  const subLocation = url.searchParams.get("subLocation")?.trim();
  if (mainLocation) query = query.eq("region_city", mainLocation);
  if (subLocation) query = query.eq("region_suburb", subLocation);

  const { data, error } = await query;
  if (error) return apiFailure("INTERNAL", "We couldn't load community posts.", 500);
  return apiSuccess({
    posts: (data ?? []).map((post) => ({
      id: post.id,
      type: post.post_type,
      title: post.title,
      excerpt: post.body,
      location: [post.region_suburb, post.region_city].filter(Boolean).join(", "),
      timeAgo: relativeTime(post.created_at),
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
