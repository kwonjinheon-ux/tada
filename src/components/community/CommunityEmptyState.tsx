"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export function CommunityEmptyState() {
  const { t } = useLanguage();

  return (
    <section className="market-search-empty community-empty-posts" role="status">
      <i className="ti ti-messages" aria-hidden="true" />
      <strong>{t("communityNoPosts")}</strong>
      <span>{t("communityFirstPostHint")}</span>
      <Link className="ui-button ui-button--primary" href="/community/create">
        <i className="ti ti-edit" aria-hidden="true" />
        {t("communityCreateFirstPost")}
      </Link>
    </section>
  );
}
