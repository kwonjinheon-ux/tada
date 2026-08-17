"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { communityPostTypeLabelKeys, type CommunityPostType } from "@/data/community-posts";

export function CommunityPostBadge({ type, muted = false }: { type: CommunityPostType; muted?: boolean }) {
  const { t } = useLanguage();
  return (
    <span className={`community-post-badge community-post-badge-${type} ${muted ? "is-muted" : ""}`}>
      {t(communityPostTypeLabelKeys[type])}
    </span>
  );
}
