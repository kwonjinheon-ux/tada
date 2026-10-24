import { allowsAnonymousCommunityPost, communityPostBodyMaxLength, communityPostBodyTextLength, communityPostCreateRequestSchema, communityPostCategorySchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadCommunityPostFeed } from "@/lib/community/post-feed";
import { containsProhibitedPublicContent, prohibitedPublicContentMessage } from "@/lib/safety/prohibited-content";

const postTypeByCategory = {
  "local-noticeboard": "notice",
  events: "event",
  qna: "question",
  recommendations: "recommendation",
  together: "event",
  "parents-kids": "notice",
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
  const searchBy = url.searchParams.get("searchBy") ?? "all";
  if (!["all", "id", "title", "content"].includes(searchBy)) return apiFailure("BAD_REQUEST", "Invalid community search field.", 400);
  const pageParam = url.searchParams.get("page");
  if (pageParam !== null && (!/^\d+$/.test(pageParam) || Number(pageParam) < 1 || Number(pageParam) > 100000)) return apiFailure("BAD_REQUEST", "Invalid community page.", 400);

  try {
    const feed = await loadCommunityPostFeed(supabase, {
      category: category.success ? category.data ?? null : null,
      mainLocation: url.searchParams.get("mainLocation")?.trim() || null,
      subLocation: url.searchParams.get("subLocation")?.trim() || null,
      search: url.searchParams.get("q") ?? "",
      searchBy: searchBy as "all" | "id" | "title" | "content",
      page: pageParam === null ? undefined : Number(pageParam),
      sort: sort === "recent" || sort === "trending" ? sort : undefined,
    });
    return apiSuccess(feed);
  } catch {
    return apiFailure("INTERNAL", "We couldn't load community posts.", 500);
  }
}

export async function POST(request: Request) {
  const payload = communityPostCreateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    const firstIssue = payload.error.issues[0];
    const field = firstIssue?.path[0];
    // One line per field, rather than a ternary that grows a level each time
    // the form gains a box.
    // The body rule that fails most is the upper one, on a long paste, and it used to be
    // reported as "too short": the writer was told to add words to a post that had too many.
    const tooLongMessage = `Your post is too long. It can hold ${communityPostBodyMaxLength.toLocaleString("en-NZ")} characters, and pasted tables and formatting count towards that.`;
    const messages: Record<string, string> = {
      categorySlug: "Choose a category before publishing.",
      title: "Add a title with at least 4 characters.",
      body: firstIssue?.code === "too_big" ? tooLongMessage : "Add at least 20 characters of detail to your post.",
      mainLocation: "Choose a main location before publishing.",
      sourceUrl: "Check the source link: it should start with http:// or https://.",
      videoUrl: "Check the video link: paste a YouTube address.",
      eventStartAt: "Choose a valid event start and end time.",
      eventEndAt: "Choose a valid event start and end time.",
    };
    const message = (typeof field === "string" ? messages[field] : undefined) ?? "Please complete each required field.";
    return apiFailure("BAD_REQUEST", message, 400, { field: typeof field === "string" ? field : null });
  }
  if (communityPostBodyTextLength(payload.data.body) < 20) return apiFailure("BAD_REQUEST", "Add at least 20 characters of detail to your post.", 400, { field: "body" });
  if (payload.data.isAnonymous && !allowsAnonymousCommunityPost(payload.data.categorySlug)) return apiFailure("BAD_REQUEST", "Anonymous posting is only available in Q&A or the free board.", 400);
  if (containsProhibitedPublicContent(payload.data.title, payload.data.body)) return apiFailure("BAD_REQUEST", prohibitedPublicContentMessage, 400);

  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Community posting is unavailable right now.", 503);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Sign in to create a community post.", 401);

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      author_id: user.id,
      is_anonymous: payload.data.isAnonymous,
      category_slug: payload.data.categorySlug,
      post_type: postTypeByCategory[payload.data.categorySlug],
      title: payload.data.title,
      body: payload.data.body,
      region_city: payload.data.mainLocation,
      region_suburb: payload.data.subLocation || null,
      // Only sent when the writer added one, so a post without links still
      // writes on a database that has yet to take this migration.
      ...(payload.data.sourceUrl ? { source_url: payload.data.sourceUrl } : {}),
      ...(payload.data.videoUrl ? { video_url: payload.data.videoUrl } : {}),
      ...(payload.data.categorySlug === "events" ? {
        event_start_at: payload.data.eventStartAt,
        event_end_at: payload.data.eventEndAt,
      } : {}),
    })
    .select("id")
    .single();

  if (error && payload.data.categorySlug === "events" && (error.code === "42703" || error.code === "PGRST204")) return apiFailure("UNAVAILABLE", "Event posting is temporarily unavailable. Please try again later.", 503);
  if (error && (payload.data.sourceUrl || payload.data.videoUrl) && (error.code === "42703" || error.code === "PGRST204")) return apiFailure("UNAVAILABLE", "Source and video links are temporarily unavailable. Please publish without them.", 503);
  if (error || !data) return apiFailure("INTERNAL", "We couldn't publish your post. Please try again.", 500);
  if (payload.data.imagePaths.length) {
    const { error: imageError } = await supabase.from("community_post_images").insert(payload.data.imagePaths.map((storage_path, display_order) => ({ post_id: data.id, owner_id: user.id, storage_path, display_order })));
    if (imageError) return apiFailure("INTERNAL", "Your post was published, but its images could not be attached.", 500);
  }
  return apiSuccess({ id: data.id }, { status: 201 });
}
