import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";
import { formatCommunityEventSchedule } from "@/lib/community/format-event-schedule";
import { LIST_PAGE_SIZE, escapeLikePattern, pageRange, totalPageCount } from "@/lib/list-pagination";
import type { CommunityPost, CommunityPostType } from "@/data/community-posts";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

type CommunityPostRow = {
  id: string;
  author_id: string;
  is_anonymous: boolean;
  post_type: string;
  title: string;
  body: string;
  region_city: string | null;
  region_suburb: string | null;
  event_start_at: string | null;
  event_end_at: string | null;
  created_at: string;
  view_count: number | null;
  score: number | null;
  share_count: number | null;
};

// The ranked feed and the search feed read the same columns, so one projection
// removes the extra round trip that only re-read engagement counters.
const POST_COLUMNS = "id, author_id, is_anonymous, post_type, title, body, region_city, region_suburb, event_start_at, event_end_at, created_at, view_count, score, share_count";
const LEGACY_POST_COLUMNS = "id, author_id, is_anonymous, post_type, title, body, region_city, region_suburb, created_at, view_count, score, share_count";

export type CommunityFeedQuery = {
  category?: string | null;
  mainLocation?: string | null;
  subLocation?: string | null;
  search?: string;
  sort?: "recent" | "trending";
  page?: number;
  searchBy?: "all" | "id" | "title" | "content";
};

export type CommunityFeedResult = { posts: CommunityPost[]; totalCount: number; page: number; totalPages: number };

const relativeTime = (createdAt: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// The desktop rail only prints a type, a title and a response count, so the
// recent feed skips every lookup that exists purely for the main post cards.
export async function loadCommunityPostFeed(supabase: SupabaseServerClient, query: CommunityFeedQuery): Promise<CommunityFeedResult> {
  const { sort, searchBy = "all" } = query;
  // The SQL ranking function treats NULL as "all"; empty URL filters must
  // match the count query's unfiltered semantics as well.
  const category = query.category || null;
  const mainLocation = query.mainLocation || null;
  const subLocation = query.subLocation || null;
  const search = (query.search ?? "").replace(/[,%()]/g, " ").trim().slice(0, 60);
  const isRecentFeed = sort === "recent" && query.page === undefined;
  const isDirectQuery = Boolean(search) || Boolean(sort);
  const isPaged = query.page !== undefined;
  let authorIdsForSearch: string[] | null = null;
  if (search && searchBy === "id") {
    const { data: matches, error: profileError } = await supabase.from("community_comment_profiles")
      .select("id").ilike("display_name", `%${escapeLikePattern(search)}%`);
    if (profileError) throw profileError;
    authorIdsForSearch = (matches ?? []).map((profile) => profile.id);
  }

  const requestedPage = isPaged ? Math.max(1, Math.floor(query.page ?? 1)) : 1;
  const countRequest = isPaged ? (() => {
    let countRequest = supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("status", "published");
    if (category) countRequest = countRequest.eq("category_slug", category);
    if (mainLocation) countRequest = countRequest.eq("region_city", mainLocation);
    if (subLocation) countRequest = countRequest.eq("region_suburb", subLocation);
    if (search) {
      const pattern = `%${escapeLikePattern(search)}%`;
      if (searchBy === "id") countRequest = countRequest.eq("is_anonymous", false).in("author_id", authorIdsForSearch?.length ? authorIdsForSearch : ["00000000-0000-0000-0000-000000000000"]);
      else if (searchBy === "title") countRequest = countRequest.ilike("title", pattern);
      else if (searchBy === "content") countRequest = countRequest.ilike("body", pattern);
      else countRequest = countRequest.or(`title.ilike.${pattern},body.ilike.${pattern}`);
    }
    return countRequest;
  })() : Promise.resolve({ count: null, error: null });

  // The ranking returns the rows themselves. Asking it for ids and then reading
  // those ids back cost a second sequential round trip — the slowest step left
  // on the feed's critical path once avatar signing was cached.
  const rankedArgs = (offset: number) => ({
    p_category_slug: category,
    p_region_city: mainLocation,
    p_region_suburb: subLocation,
    p_limit: isPaged ? LIST_PAGE_SIZE : 40,
    p_offset: offset,
  });
  const rankedPostsRequest = isDirectQuery ? null : supabase.rpc("get_ranked_community_posts", rankedArgs(isPaged ? pageRange(requestedPage).from : 0));
  const userRequest = isRecentFeed ? Promise.resolve({ data: { user: null } }) : supabase.auth.getUser();
  const [{ count, error: countError }, { data: rankedPosts, error: rankedPostsError }, { data: { user } }] = await Promise.all([
    countRequest,
    rankedPostsRequest ?? Promise.resolve({ data: [], error: null }),
    userRequest,
  ]);
  if (countError) throw countError;
  // Until the row-returning function is in place the older id-only pair is
  // still there, so a deployment that runs ahead of its migration keeps
  // working rather than serving an empty feed.
  const needsIdFallback = Boolean(rankedPostsError) && rankedPostsError?.code === "PGRST202";
  if (rankedPostsError && !needsIdFallback) throw rankedPostsError;
  const totalCount = isPaged ? count ?? 0 : 0;
  const totalPages = totalPageCount(totalCount);
  const page = isPaged ? Math.min(requestedPage, totalPages) : 1;

  let rankedRows = (rankedPosts ?? []) as CommunityPostRow[];
  let orderedPostIds: string[] = [];
  if (!isDirectQuery && needsIdFallback) {
    const { data: fallbackIds, error: fallbackError } = await supabase.rpc(isPaged ? "get_paged_ranked_community_post_ids" : "get_ranked_community_post_ids", {
      p_category_slug: category,
      p_region_city: mainLocation,
      p_region_suburb: subLocation,
      p_limit: isPaged ? LIST_PAGE_SIZE : 40,
      ...(isPaged ? { p_offset: pageRange(page).from } : {}),
    });
    if (fallbackError) throw fallbackError;
    orderedPostIds = (fallbackIds ?? []).map((post: { id: string }) => post.id);
  } else if (rankedPostsRequest && page !== requestedPage) {
    // The requested page was past the end; re-read at the clamped offset.
    const { data: lastPageRows, error: lastPageError } = await supabase.rpc("get_ranked_community_posts", rankedArgs(pageRange(page).from));
    if (lastPageError) throw lastPageError;
    rankedRows = (lastPageRows ?? []) as CommunityPostRow[];
  }

  const loadPosts = async (columns: string) => {
    if (!isDirectQuery) return orderedPostIds.length
      ? supabase.from("community_posts").select(columns as typeof POST_COLUMNS).in("id", orderedPostIds)
      : { data: [], error: null };

    let request = supabase.from("community_posts").select(columns as typeof POST_COLUMNS).eq("status", "published");
    if (category) request = request.eq("category_slug", category);
    if (mainLocation) request = request.eq("region_city", mainLocation);
    if (subLocation) request = request.eq("region_suburb", subLocation);
    if (search) {
      const pattern = `%${escapeLikePattern(search)}%`;
      if (searchBy === "id") request = request.eq("is_anonymous", false).in("author_id", authorIdsForSearch?.length ? authorIdsForSearch : ["00000000-0000-0000-0000-000000000000"]);
      else if (searchBy === "title") request = request.ilike("title", pattern);
      else if (searchBy === "content") request = request.ilike("body", pattern);
      else request = request.or(`title.ilike.${pattern},body.ilike.${pattern}`);
    }
    request = sort === "trending"
      ? request.order("score", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
      : request.order("created_at", { ascending: false }).order("id", { ascending: false });
    request = isPaged ? request.range(pageRange(page).from, pageRange(page).to) : request.limit(search ? 100 : isRecentFeed ? 10 : 40);
    return request;
  };
  // The ranked path already holds its rows in order; only a search, a sort or
  // the id fallback still has to read the table.
  const needsPostRead = isDirectQuery || orderedPostIds.length > 0;
  let { data: unorderedPostsData, error } = needsPostRead ? await loadPosts(POST_COLUMNS) : { data: [], error: null };
  if (error?.code === "42703" || error?.code === "PGRST204") {
    ({ data: unorderedPostsData, error } = await loadPosts(LEGACY_POST_COLUMNS));
  }
  if (error) throw error;

  const unorderedPosts = (unorderedPostsData ?? []) as CommunityPostRow[];
  const postsById = new Map(unorderedPosts.map((post) => [post.id, post]));
  const data: CommunityPostRow[] = isDirectQuery ? unorderedPosts : orderedPostIds.length ? orderedPostIds.flatMap((postId: string) => {
    const post = postsById.get(postId);
    return post ? [post] : [];
  }) : rankedRows;
  const postIds = data.map((post) => post.id);
  if (!postIds.length) return { posts: [], totalCount, page, totalPages };

  const authorIds = [...new Set(data.filter((post) => !post.is_anonymous).map((post) => post.author_id))];
  // Each media pipeline starts signing as soon as its own lookup completes;
  // slower comments or engagement reads must not hold up image work.
  const imagesRequest = (async () => {
    const { data: imageRows } = isRecentFeed ? { data: [] } : await supabase.from("community_post_images").select("post_id,storage_path,display_order").in("post_id", postIds).order("display_order");
    const firstImagePathByPost = new Map<string, string>();
    for (const image of imageRows ?? []) if (!firstImagePathByPost.has(image.post_id)) firstImagePathByPost.set(image.post_id, image.storage_path);
    const [signed, signedThumbnails] = await Promise.all([
      getSignedStorageImages("community-post-images", (imageRows ?? []).map((image) => image.storage_path), "gallery"),
      getSignedStorageImages("community-post-images", [...firstImagePathByPost.values()], "card"),
    ]);
    return { imageRows, firstImagePathByPost, signed, signedThumbnails };
  })();
  const authorsRequest = (async () => {
    const { data: authors } = isRecentFeed || !authorIds.length ? { data: [] } : await supabase.from("community_comment_profiles").select("id,display_name,avatar_path").in("id", authorIds);
    const avatarPaths = (authors ?? []).map((author) => author.avatar_path).filter((path): path is string => Boolean(path));
    // Signing these straight off the storage client re-signed the same handful
    // of avatars on every request — the slowest leg of the whole feed, and the
    // one the rest of the stage waited on. getSignedStorageImages caches, and
    // serves the avatar-sized transform rather than the original file.
    const avatars = await getSignedStorageImages("profile-avatars", avatarPaths, "avatar");
    return { authors, avatars };
  })();
  const [{ imageRows, firstImagePathByPost, signed, signedThumbnails }, { authors, avatars }, { data: commentRows }, { data: voteRows }, { data: wishlistRows }] = await Promise.all([
    imagesRequest,
    authorsRequest,
    supabase.from("community_post_comments").select("post_id").in("post_id", postIds).is("deleted_at", null),
    user && !isRecentFeed ? supabase.from("community_post_votes").select("post_id,value").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
    user && !isRecentFeed ? supabase.from("community_wishlist").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
  ]);
  const authorsById = new Map((authors ?? []).map((author) => [author.id, author]));
  const votes = new Map((voteRows ?? []).map((vote) => [vote.post_id, vote.value]));
  const savedPostIds = new Set((wishlistRows ?? []).map((row) => row.post_id));
  const commentCounts = new Map<string, number>();
  for (const comment of commentRows ?? []) commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1);
  const imagesByPost = new Map<string, { src: string; alt: string }[]>();
  for (const image of imageRows ?? []) {
    const src = signed.get(image.storage_path);
    if (src) imagesByPost.set(image.post_id, [...(imagesByPost.get(image.post_id) ?? []), { src, alt: "Community post image" }]);
  }

  const posts = data.map((post) => {
    const author = post.is_anonymous ? undefined : authorsById.get(post.author_id);
    const thumbnailPath = firstImagePathByPost.get(post.id);
    return {
      id: post.id,
      type: post.post_type as CommunityPostType,
      title: post.title,
      excerpt: post.body,
      location: [post.region_suburb, post.region_city].filter(Boolean).join(", "),
      timeAgo: relativeTime(post.created_at),
      eventDate: formatCommunityEventSchedule(post.event_start_at ?? null, post.event_end_at ?? null),
      eventStartAt: post.event_start_at ?? null,
      eventEndAt: post.event_end_at ?? null,
      thumbnail: thumbnailPath ? signedThumbnails.get(thumbnailPath) : undefined,
      images: imagesByPost.get(post.id) ?? [],
      responseCount: commentCounts.get(post.id) ?? 0,
      score: post.score ?? 0,
      myVote: votes.get(post.id) ?? 0,
      shareCount: post.share_count ?? 0,
      viewCount: post.view_count ?? 0,
      authorName: author?.display_name ?? undefined,
      authorAvatarUrl: author?.avatar_path ? avatars.get(author.avatar_path) ?? null : null,
      isAnonymous: post.is_anonymous,
      isOwner: user?.id === post.author_id,
      isSaved: savedPostIds.has(post.id),
    };
  });
  return { posts, totalCount: isPaged ? totalCount : posts.length, page, totalPages };
}
