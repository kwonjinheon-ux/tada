import { communityPostCreateRequestSchema, communityPostCategorySchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadCommunityPostFeed } from "@/lib/community/post-feed";

const postTypeByCategory = {
  "local-noticeboard": "notice",
  events: "event",
  qna: "question",
  recommendations: "recommendation",
  together: "event",
  immigration: "notice",
  "free-board": "notice",
} as const;

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Community posts are unavailable right now.", 503);

  const url = new URL(request.url);
  const category = communityPostCategorySchema.safeParse(url.searchParams.get("category"));
  if (url.searchParams.has("category") && !category.success) return apiFailure("BAD_REQUEST", "Invalid community category.", 400);
  const sort = url.searchParams.get("sort");
  if (sort && sort !== "recent" && sort !== "trending") return apiFailure("BAD_REQUEST", "Invalid community post sort.", 400);

  try {
    const posts = await loadCommunityPostFeed(supabase, {
      category: category.success ? category.data ?? null : null,
      mainLocation: url.searchParams.get("mainLocation")?.trim() || null,
      subLocation: url.searchParams.get("subLocation")?.trim() || null,
      search: url.searchParams.get("q") ?? "",
      sort: sort === "recent" || sort === "trending" ? sort : undefined,
    });
    return apiSuccess({ posts });
  } catch {
    return apiFailure("INTERNAL", "We couldn't load community posts.", 500);
  }
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
