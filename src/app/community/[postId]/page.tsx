import { notFound } from "next/navigation";
import { CommunityPostDetailClient, type CommunityPostDetail } from "@/components/community/CommunityPostDetailClient";
import { communityPosts } from "@/data/community-posts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";
import { communityPostCategorySchema } from "@/contracts/api";
import { formatCommunityEventSchedule } from "@/lib/community/format-event-schedule";

export const dynamic = "force-dynamic";

function cleanHtml(value: string) {
  const allowed = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "code", "pre"]);
  return value.replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, name: string) => {
    const normalized = name.toLowerCase();
    if (!allowed.has(normalized)) return "";
    return tag.startsWith("</") ? `</${normalized}>` : `<${normalized}>`;
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function CommunityPostPage({ params, searchParams }: { params: Promise<{ postId: string }>; searchParams: Promise<{ category?: string; action?: string }> }) {
  const { postId } = await params;
  const requestedSearchParams = await searchParams;
  const category = communityPostCategorySchema.safeParse(requestedSearchParams.category);
  const initialAction = requestedSearchParams.action === "edit" || requestedSearchParams.action === "delete" ? requestedSearchParams.action : undefined;
  const relatedCategory = category.success ? category.data : undefined;
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const postRequest = async () => {
      const current = await supabase.from("community_posts").select("id,author_id,is_anonymous,post_type,title,body,region_city,region_suburb,event_start_at,event_end_at,created_at,view_count,score,share_count").eq("id", postId).eq("status", "published").maybeSingle();
      if (current.error?.code !== "42703" && current.error?.code !== "PGRST204") return current;
      return supabase.from("community_posts").select("id,author_id,is_anonymous,post_type,title,body,region_city,region_suburb,created_at,view_count,score,share_count").eq("id", postId).eq("status", "published").maybeSingle();
    };
    // The post and verified user can be fetched together; engagement reads
    // depend on the user, while image signing only depends on the post.
    const [{ data: { user } }, { data: post }] = await Promise.all([
      supabase.auth.getUser(),
      postRequest(),
    ]);
    if (post) {
      // Sign images and the avatar as soon as their own lookup completes.
      // Neither needs to wait for the comments, votes or saved-state queries.
      const imagesPromise = supabase.from("community_post_images").select("storage_path").eq("post_id", post.id).order("display_order").then(async ({ data: imageRows }) => {
        const paths = (imageRows ?? []).map((image) => image.storage_path as string);
        return { paths, urls: await getSignedStorageImages("community-post-images", paths, "gallery") };
      });
      const authorPromise = (post.is_anonymous
        ? Promise.resolve({ data: null })
        : supabase.from("community_comment_profiles").select("display_name,avatar_path").eq("id", post.author_id).maybeSingle()
      ).then(async ({ data: author }) => {
        if (!author?.avatar_path) return { author, avatarUrl: null };
        const { data } = await supabase.storage.from("profile-avatars").createSignedUrl(author.avatar_path, 3600);
        return { author, avatarUrl: data?.signedUrl ?? null };
      });
      const [{ paths, urls }, { author, avatarUrl }, { count: responseCount }, { data: vote }, { data: saved }] = await Promise.all([
        imagesPromise,
        authorPromise,
        supabase.from("community_post_comments").select("id", { count: "exact", head: true }).eq("post_id", post.id).is("deleted_at", null),
        user ? supabase.from("community_post_votes").select("value").eq("post_id", post.id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
        user ? supabase.from("community_wishlist").select("post_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const detail: CommunityPostDetail = { id: post.id, type: post.post_type as CommunityPostDetail["type"], title: post.title, body: cleanHtml(post.body), location: [post.region_suburb, post.region_city].filter(Boolean).join(", ") || "New Zealand", createdAt: formatDate(post.created_at), eventDate: formatCommunityEventSchedule("event_start_at" in post && typeof post.event_start_at === "string" ? post.event_start_at : null, "event_end_at" in post && typeof post.event_end_at === "string" ? post.event_end_at : null), authorName: author?.display_name ?? null, authorAvatarUrl: avatarUrl, isAnonymous: post.is_anonymous, viewCount: post.view_count ?? 0, score: post.score ?? 0, myVote: vote?.value === -1 || vote?.value === 1 ? vote.value : 0, shareCount: post.share_count ?? 0, responseCount: responseCount ?? 0, isOwner: user?.id === post.author_id, isSaved: Boolean(saved), images: paths.map((path) => ({ src: urls.get(path), alt: post.title })).filter((image): image is { src: string; alt: string } => Boolean(image.src)) };
      return <CommunityPostDetailClient post={detail} relatedCategory={relatedCategory} initialAction={initialAction} />;
    }
  }

  const fallback = communityPosts.find((post) => post.id === postId);
  if (!fallback) notFound();
  return <CommunityPostDetailClient post={{ id: fallback.id, type: fallback.type, title: fallback.title, body: cleanHtml(fallback.excerpt), location: fallback.location, createdAt: fallback.timeAgo ?? "Recently", eventDate: fallback.eventDate, authorName: null, authorAvatarUrl: null, viewCount: fallback.viewCount ?? 0, score: fallback.score ?? 0, myVote: fallback.myVote ?? 0, shareCount: fallback.shareCount ?? 0, responseCount: fallback.responseCount ?? 0, isOwner: false, isSaved: false, images: fallback.image ? [{ src: fallback.image, alt: fallback.imageAlt ?? fallback.title }] : [] }} relatedCategory={relatedCategory} initialAction={initialAction} />;
}
