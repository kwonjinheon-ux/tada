import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";
import { formatCommunityEventSchedule } from "@/lib/community/format-event-schedule";

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
};

export type CommunityFeedPost = {
  id: string;
  type: string;
  title: string;
  excerpt: string;
  location: string;
  timeAgo: string;
  eventDate?: string;
  thumbnail?: string;
  images: { src: string; alt: string }[];
  responseCount: number;
  score: number;
  myVote: number;
  shareCount: number;
  viewCount: number;
  authorName?: string;
  authorAvatarUrl: string | null;
  isAnonymous: boolean;
  isOwner: boolean;
  isSaved: boolean;
};

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
export async function loadCommunityPostFeed(supabase: SupabaseServerClient, query: CommunityFeedQuery): Promise<CommunityFeedPost[]> {
  const { category = null, mainLocation = null, subLocation = null, sort } = query;
  const search = (query.search ?? "").replace(/[,%()]/g, " ").trim().slice(0, 60);
  const isRecentFeed = sort === "recent";
  const isDirectQuery = Boolean(search) || Boolean(sort);

  const rankedPostIdsRequest = isDirectQuery ? null : supabase.rpc("get_ranked_community_post_ids", {
    p_category_slug: category,
    p_region_city: mainLocation,
    p_region_suburb: subLocation,
    p_limit: 40,
  });
  const userRequest = isRecentFeed ? Promise.resolve({ data: { user: null } }) : supabase.auth.getUser();
  const [{ data: rankedPostIds, error: rankedPostIdsError }, { data: { user } }] = await Promise.all([
    rankedPostIdsRequest ?? Promise.resolve({ data: [], error: null }),
    userRequest,
  ]);
  if (rankedPostIdsError) throw rankedPostIdsError;
  const orderedPostIds = (rankedPostIds ?? []).map((post: { id: string }) => post.id);

  const loadPosts = async (columns: string) => {
    if (!isDirectQuery) return orderedPostIds.length
      ? supabase.from("community_posts").select(columns as typeof POST_COLUMNS).in("id", orderedPostIds)
      : { data: [], error: null };

    let request = supabase.from("community_posts").select(columns as typeof POST_COLUMNS).eq("status", "published");
    request = sort === "trending"
      ? request.order("score", { ascending: false }).order("created_at", { ascending: false })
      : request.order("created_at", { ascending: false });
    request = request.limit(search ? 100 : isRecentFeed ? 10 : 40);
    if (category) request = request.eq("category_slug", category);
    if (mainLocation) request = request.eq("region_city", mainLocation);
    if (subLocation) request = request.eq("region_suburb", subLocation);
    if (search) request = request.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
    return request;
  };
  let { data: unorderedPostsData, error } = await loadPosts(POST_COLUMNS);
  if (error?.code === "42703" || error?.code === "PGRST204") {
    ({ data: unorderedPostsData, error } = await loadPosts(LEGACY_POST_COLUMNS));
  }
  if (error) throw error;

  const unorderedPosts = (unorderedPostsData ?? []) as CommunityPostRow[];
  const postsById = new Map(unorderedPosts.map((post) => [post.id, post]));
  const data: CommunityPostRow[] = isDirectQuery ? unorderedPosts : orderedPostIds.flatMap((postId: string) => {
    const post = postsById.get(postId);
    return post ? [post] : [];
  });
  const postIds = data.map((post) => post.id);
  if (!postIds.length) return [];

  const authorIds = [...new Set(data.filter((post) => !post.is_anonymous).map((post) => post.author_id))];
  const [{ data: imageRows }, { data: commentRows }, { data: voteRows }, { data: wishlistRows }, { data: authors }] = await Promise.all([
    isRecentFeed ? Promise.resolve({ data: [] }) : supabase.from("community_post_images").select("post_id,storage_path,display_order").in("post_id", postIds).order("display_order"),
    supabase.from("community_post_comments").select("post_id").in("post_id", postIds).is("deleted_at", null),
    user && !isRecentFeed ? supabase.from("community_post_votes").select("post_id,value").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
    user && !isRecentFeed ? supabase.from("community_wishlist").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
    isRecentFeed || !authorIds.length ? Promise.resolve({ data: [] }) : supabase.from("community_comment_profiles").select("id,display_name,avatar_path").in("id", authorIds),
  ]);

  // Cards render a small square crop, so the list thumbnail is signed at card
  // size while full-size gallery URLs stay available for the lightbox.
  const galleryPaths = (imageRows ?? []).map((image) => image.storage_path);
  const firstImagePathByPost = new Map<string, string>();
  for (const image of imageRows ?? []) if (!firstImagePathByPost.has(image.post_id)) firstImagePathByPost.set(image.post_id, image.storage_path);
  const avatarPaths = [...new Set((authors ?? []).map((author) => author.avatar_path).filter((path): path is string => Boolean(path)))];
  const [signed, signedThumbnails, { data: signedAvatars }] = await Promise.all([
    getSignedStorageImages("community-post-images", galleryPaths, "gallery"),
    getSignedStorageImages("community-post-images", [...firstImagePathByPost.values()], "card"),
    avatarPaths.length ? supabase.storage.from("profile-avatars").createSignedUrls(avatarPaths, 3600) : Promise.resolve({ data: [] }),
  ]);

  const avatars = new Map((signedAvatars ?? []).filter((avatar) => avatar.path && avatar.signedUrl).map((avatar) => [avatar.path as string, avatar.signedUrl as string]));
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

  return data.map((post) => {
    const author = post.is_anonymous ? undefined : authorsById.get(post.author_id);
    const thumbnailPath = firstImagePathByPost.get(post.id);
    return {
      id: post.id,
      type: post.post_type,
      title: post.title,
      excerpt: post.body,
      location: [post.region_suburb, post.region_city].filter(Boolean).join(", "),
      timeAgo: relativeTime(post.created_at),
      eventDate: formatCommunityEventSchedule(post.event_start_at ?? null, post.event_end_at ?? null),
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
}
