"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export type ManageListingsCategory = "all" | "market" | "bargain" | "services";

type ManageListingsCategoryTabsProps = {
  activeCategory: ManageListingsCategory;
  counts: Record<ManageListingsCategory, number>;
};

const categories: ManageListingsCategory[] = ["all", "market", "bargain", "services"];

export function ManageListingsCategoryTabs({ activeCategory, counts }: ManageListingsCategoryTabsProps) {
  const { locale, t } = useLanguage();
  const labels: Record<ManageListingsCategory, string> = {
    all: t("all"),
    market: locale === "ko" ? "마켓" : "Market",
    bargain: locale === "ko" ? "알뜰거래" : "Bargain",
    services: locale === "ko" ? "서비스" : "Services",
  };

  return <nav className="manage-listings-category-tabs" aria-label={locale === "ko" ? "등록 유형 필터" : "Listing type filter"}>
    {categories.map((category) => {
      const isActive = activeCategory === category;
      const href = category === "all" ? "/market/dashboard/listings" : `/market/dashboard/listings?category=${category}`;
      return <Link className={`manage-listings-category-tab${isActive ? " is-active" : ""}`} href={href} aria-current={isActive ? "page" : undefined} key={category}>
        <span>{labels[category]}</span><b>{counts[category]}</b>
      </Link>;
    })}
  </nav>;
}
