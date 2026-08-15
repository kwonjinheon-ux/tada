"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { communityPostTypeIcons, communityPostTypeLabelKeys, type CommunityPostType } from "@/data/community-posts";

export function CommunityPostBadge({ type, muted = false }: { type: CommunityPostType; muted?: boolean }) {
  const { t } = useLanguage();

  return (
    <span className={`community-post-badge community-post-badge-${type} ${muted ? "is-muted" : ""}`}>
      <i className={`fa-solid ${communityPostTypeIcons[type]}`} aria-hidden="true" />
      {t(communityPostTypeLabelKeys[type])}
    </span>
  );
}
