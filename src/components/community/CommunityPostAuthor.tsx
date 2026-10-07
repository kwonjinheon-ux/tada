"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

type CommunityPostAuthorProps = {
  name: string | null | undefined;
  avatarUrl: string | null | undefined;
  className: string;
  avatarClassName: string;
  isAnonymous?: boolean;
};

/** Shared identity treatment for community feed cards and post details. */
export function CommunityPostAuthor({ name, avatarUrl, className, avatarClassName, isAnonymous = false }: CommunityPostAuthorProps) {
  const { t } = useLanguage();
  const label = isAnonymous ? t("communityAnonymousAuthor") : name ?? t("communityMemberFallback");
  return <span className={className}><Avatar src={isAnonymous ? null : avatarUrl} name={label} className={avatarClassName} initials="double" /><strong className="community-post-author-name">{label}</strong></span>;
}
