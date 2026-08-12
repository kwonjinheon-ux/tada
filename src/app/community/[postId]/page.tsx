import { notFound } from "next/navigation";
import { CommunityPostDetailClient, type CommunityPostDetail } from "@/components/community/CommunityPostDetailClient";
import { communityPosts } from "@/data/community-posts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

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

export default async function CommunityPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: post } = await supabase.from("community_posts").select("id,author_id,post_type,title,body,region_city,region_suburb,created_at").eq("id", postId).eq("status", "published").maybeSingle();
    if (post) {
      const { data: imageRows } = await supabase.from("community_post_images").select("storage_path").eq("post_id", post.id).order("display_order");
      const paths = (imageRows ?? []).map((image) => image.storage_path as string);
      const urls = await getSignedStorageImages("community-post-images", paths, "gallery");
      const { data: author } = await supabase.from("community_comment_profiles").select("display_name,avatar_path").eq("id", post.author_id).maybeSingle();
      const { data: signedAvatar } = author?.avatar_path ? await supabase.storage.from("profile-avatars").createSignedUrl(author.avatar_path, 3600) : { data: null };
      const detail: CommunityPostDetail = { id: post.id, type: post.post_type as CommunityPostDetail["type"], title: post.title, body: cleanHtml(post.body), location: [post.region_suburb, post.region_city].filter(Boolean).join(", ") || "New Zealand", createdAt: formatDate(post.created_at), authorName: author?.display_name ?? "Community member", authorAvatarUrl: signedAvatar?.signedUrl ?? null, isOwner: user?.id === post.author_id, images: paths.map((path) => ({ src: urls.get(path), alt: post.title })).filter((image): image is { src: string; alt: string } => Boolean(image.src)) };
      return <CommunityPostDetailClient post={detail} />;
    }
  }

  const fallback = communityPosts.find((post) => post.id === postId);
  if (!fallback) notFound();
  return <CommunityPostDetailClient post={{ id: fallback.id, type: fallback.type, title: fallback.title, body: cleanHtml(fallback.excerpt), location: fallback.location, createdAt: fallback.timeAgo ?? fallback.eventDate ?? "Recently", authorName: "Community member", authorAvatarUrl: null, isOwner: false, images: fallback.image ? [{ src: fallback.image, alt: fallback.imageAlt ?? fallback.title }] : [] }} />;
}
