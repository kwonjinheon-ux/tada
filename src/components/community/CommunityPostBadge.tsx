import { communityPostTypeEnglishLabels, type CommunityPostType } from "@/data/community-posts";

export function CommunityPostBadge({ type, muted = false }: { type: CommunityPostType; muted?: boolean }) {
  return (
    <span className={`community-post-badge community-post-badge-${type} ${muted ? "is-muted" : ""}`}>
      {communityPostTypeEnglishLabels[type]}
    </span>
  );
}
