"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

type CommunityPostAuthorProps = {
  name: string | null | undefined;
  avatarUrl: string | null | undefined;
  className: string;
  avatarClassName: string;
};

/** Shared identity treatment for community feed cards and post details. */
export function CommunityPostAuthor({ name, avatarUrl, className, avatarClassName }: CommunityPostAuthorProps) {
  const { t } = useLanguage();
  const label = name ?? t("communityMemberFallback");
  return <span className={className}><Avatar src={avatarUrl} name={label} className={avatarClassName} initials="double" /><strong className="community-post-author-name">{label}</strong></span>;
}
