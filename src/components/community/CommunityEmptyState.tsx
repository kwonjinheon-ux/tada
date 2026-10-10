"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { communityCreateHref, type CommunityCategory } from "@/components/community/CommunityFilterSidebar";

export function CommunityEmptyState({ category }: { category: CommunityCategory }) {
  const { t } = useLanguage();

  return (
    <section className="market-search-empty community-empty-posts" role="status">
      <i className="ms ms-forum" aria-hidden="true" />
      <strong>{t("communityNoPosts")}</strong>
      <span>{t("communityFirstPostHint")}</span>
      <Link className="ui-button ui-button--primary" href={communityCreateHref(category)}>
        <i className="ms ms-edit" aria-hidden="true" />
        {t("communityCreateFirstPost")}
      </Link>
    </section>
  );
}
