import { notFound } from "next/navigation";
import { CommunityMemberPosts } from "@/components/community/CommunityMemberPosts";
import { loadCommunityMemberPostAccess } from "@/lib/community/member-post-access";
import { loadCommunityPostFeed } from "@/lib/community/post-feed";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImage } from "@/lib/supabase/storage-image";

export const dynamic = "force-dynamic";

export default async function CommunityMemberPostsPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const access = await loadCommunityMemberPostAccess(supabase, memberId);
  if (!access.member) notFound();

  const [avatarUrl, feed] = await Promise.all([
    access.member.avatar_path ? getSignedStorageImage("profile-avatars", access.member.avatar_path, "avatar") : Promise.resolve(null),
    access.canView ? loadCommunityPostFeed(supabase, { authorId: memberId, sort: "recent" }) : Promise.resolve({ posts: [], totalCount: 0, page: 1, totalPages: 0 }),
  ]);

  return <CommunityMemberPosts member={{ id: access.member.id, name: access.member.display_name, avatarUrl }} posts={feed.posts} isVisible={access.canView} isOwner={access.viewerId === memberId} />;
}
