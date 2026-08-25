"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export type ManageListingsCategory = "all" | "market" | "bargain" | "services";

type ManageListingsCategoryTabsProps = {
  activeCategory: ManageListingsCategory;
  counts: Record<ManageListingsCategory, number>;
};

const categories: ManageListingsCategory[] = ["all", "market", "bargain", "services"];

export function ManageListingsCategoryTabs({ activeCategory, counts }: ManageListingsCategoryTabsProps) {
  const { locale, t } = useLanguage();
  const searchParams = useSearchParams();
  const labels: Record<ManageListingsCategory, string> = {
    all: t("all"),
    market: locale === "ko" ? "마켓" : "Market",
    bargain: locale === "ko" ? "알뜰거래" : "Bargain",
    services: locale === "ko" ? "서비스" : "Services",
  };

  return <nav className="manage-listings-category-tabs" aria-label={locale === "ko" ? "등록 유형 필터" : "Listing type filter"}>
    {categories.map((category) => {
      const isActive = activeCategory === category;
      // Switching tab keeps the search but starts its result set at page one.
      const query = new URLSearchParams(searchParams.toString());
      query.delete("page");
      if (category === "all") query.delete("category");
      else query.set("category", category);
      const href = query.toString() ? `/market/dashboard/listings?${query}` : "/market/dashboard/listings";
      return <Link className={`manage-listings-category-tab${isActive ? " is-active" : ""}`} href={href} aria-current={isActive ? "page" : undefined} key={category}>
        <span>{labels[category]}</span><b>{counts[category]}</b>
      </Link>;
    })}
  </nav>;
}
