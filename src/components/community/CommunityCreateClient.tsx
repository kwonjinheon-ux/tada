"use client";

import { ComingSoon } from "@/components/ComingSoon";
import { useLanguage } from "@/components/LanguageProvider";

export function CommunityCreateClient() {
  const { t } = useLanguage();

  return (
    <main className="jobs-page">
      <ComingSoon kicker={t("comingSoon")} title={t("communityCreateTitle")} description={t("communityCreateDescription")} />
    </main>
  );
}
