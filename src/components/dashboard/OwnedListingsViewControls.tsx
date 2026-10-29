"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { SelectMenu } from "@/components/ui/SelectMenu";

function useUpdateOwnedListingsQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (key: "sort" | "excludeCompleted", value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };
}

export function OwnedListingsViewControls({ sort, excludeCompleted, isServices }: { sort: "newest" | "oldest"; excludeCompleted: boolean; isServices: boolean }) {
  const { locale, t } = useLanguage();
  const update = useUpdateOwnedListingsQuery();

  return <>
  <div className="owned-listings-view-controls">
    <SelectMenu
      id="owned-listings-sort"
      name="sort"
      className={`account-toolbar-icon-select owned-listings-sort${sort === "oldest" ? " is-active" : ""}`}
      icon={sort === "oldest" ? "ms-arrow-upward" : "ms-arrow-downward"}
      label={`${t("ownedListingSortLabel")}: ${t(sort === "oldest" ? "ownedListingSortOldest" : "ownedListingSortNewest")}`}
      placeholder={t("ownedListingSortNewest")}
      options={[{ value: "newest", label: t("ownedListingSortNewest") }, { value: "oldest", label: t("ownedListingSortOldest") }]}
      value={sort}
      onChange={(value) => update("sort", value === "oldest" ? value : null)}
      hideLabel
      includeEmptyOption={false}
    />
    <SelectMenu
      id="owned-listings-status-filter"
      name="excludeCompleted"
      className={`account-toolbar-icon-select owned-listings-status-filter${excludeCompleted && !isServices ? " is-active" : ""}`}
      icon="ms-tune"
      label={`${t("ownedListingStatusFilterLabel")}: ${t(excludeCompleted ? "ownedListingExcludeCompleted" : "ownedListingShowAllStatuses")}`}
      placeholder={t("ownedListingShowAllStatuses")}
      options={[{ value: "all", label: t("ownedListingShowAllStatuses") }, { value: "excluded", label: t("ownedListingExcludeCompleted") }]}
      value={excludeCompleted ? "excluded" : "all"}
      onChange={(value) => update("excludeCompleted", value === "excluded" ? "1" : null)}
      disabled={isServices}
      hideLabel
      includeEmptyOption={false}
    />
  </div>
  {sort === "oldest" || (excludeCompleted && !isServices) ? <div className="owned-listings-applied-filters" aria-label={locale === "ko" ? "적용된 정렬과 필터" : "Applied sort and filters"}>
    {sort === "oldest" ? <Button variant="secondary" size="sm" pill className="account-applied-chip" aria-label={locale === "ko" ? "오래된순 해제" : "Reset oldest first sorting"} onClick={() => update("sort", null)}>{t("ownedListingSortOldest")}<i className="ms ms-close" aria-hidden="true" /></Button> : null}
    {excludeCompleted && !isServices ? <Button variant="secondary" size="sm" pill className="account-applied-chip" aria-label={locale === "ko" ? "거래 완료 제외 해제" : "Show completed listings again"} onClick={() => update("excludeCompleted", null)}>{t("ownedListingExcludeCompleted")}<i className="ms ms-close" aria-hidden="true" /></Button> : null}
  </div> : null}
  </>;
}
