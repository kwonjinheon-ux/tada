"use client";

import Link from "next/link";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";
import type { CommunityCategory } from "@/components/community/CommunityFilterSidebar";

const communityBrowseCopy: Record<CommunityCategory, { title: TranslationKey; description: TranslationKey }> = {
  all: { title: "communityIntroTitle", description: "communityIntroDescription" },
  qna: { title: "communityIntroQnaTitle", description: "communityIntroQnaDescription" },
  "free-board": { title: "communityIntroFreeBoardTitle", description: "communityIntroFreeBoardDescription" },
  "local-noticeboard": { title: "communityIntroLocalNoticeboardTitle", description: "communityIntroLocalNoticeboardDescription" },
  events: { title: "communityIntroEventsTitle", description: "communityIntroEventsDescription" },
  recommendations: { title: "communityIntroRecommendationsTitle", description: "communityIntroRecommendationsDescription" },
  together: { title: "communityIntroTogetherTitle", description: "communityIntroTogetherDescription" },
  immigration: { title: "communityIntroImmigrationTitle", description: "communityIntroImmigrationDescription" },
};

/** Shared, action-oriented Community category introduction and posting CTA. */
export function CommunityBrowseIntro({ category }: { category: CommunityCategory }) {
  const { t } = useLanguage();
  const copy = communityBrowseCopy[category];

  return <div className="browse-intro browse-intro--with-create">
    <div className="browse-intro-copy">
      <h1>{t(copy.title)}</h1>
      <p>{t(copy.description)}</p>
    </div>
    <Link className="browse-create-button ui-button ui-button--lg" href="/community/create">
      <i className="ms ms-add" aria-hidden="true" />
      <span>{t("createPostAction")}</span>
    </Link>
  </div>;
}
