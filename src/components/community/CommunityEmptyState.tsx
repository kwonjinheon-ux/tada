"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export function CommunityEmptyState() {
  const { t } = useLanguage();

  return (
    <section className="market-search-empty community-empty-posts" role="status">
      <i className="fa-regular fa-comments" aria-hidden="true" />
      <strong>{t("communityNoPosts")}</strong>
      <span>{t("communityFirstPostHint")}</span>
      <Link className="ui-button ui-button--primary" href="/community/create">
        <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
        {t("communityCreateFirstPost")}
      </Link>
    </section>
  );
}
