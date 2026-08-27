"use client";

import { useLanguage } from "@/components/LanguageProvider";

export function TextOnlyMedia({ className = "" }: { className?: string }) {
  const { t } = useLanguage();

  return (
    <span className={`text-only-media ${className}`.trim()} aria-label={t("textOnly")}>
      <i className="ms ms-description" aria-hidden="true" />
      <span>{t("textOnly")}</span>
    </span>
  );
}
