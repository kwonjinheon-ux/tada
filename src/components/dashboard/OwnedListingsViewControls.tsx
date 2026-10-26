"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { SelectMenu } from "@/components/ui/SelectMenu";

export function OwnedListingsViewControls({ sort, excludeCompleted, allowCompletedFilter }: { sort: "newest" | "oldest"; excludeCompleted: boolean; allowCompletedFilter: boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(false);
  const activeCount = Number(sort === "oldest") + Number(allowCompletedFilter && excludeCompleted);

  const update = (key: "sort" | "excludeCompleted", value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return <>
    <Button
      variant="secondary"
      size="sm"
      className={`owned-listings-filter-trigger${activeCount ? " is-active" : ""}`}
      aria-expanded={expanded}
      aria-controls={expanded ? "owned-listings-filter-panel" : undefined}
      onClick={() => setExpanded((current) => !current)}
    ><i className="ms ms-tune" aria-hidden="true" />{t("ownedListingFilterLabel")}{activeCount ? <span aria-hidden="true">{activeCount}</span> : null}</Button>
    {expanded ? <div className={`owned-listings-filter-panel ui-panel${allowCompletedFilter ? "" : " is-sort-only"}`} id="owned-listings-filter-panel" role="group" aria-label={t("ownedListingFilterLabel")}>
      <SelectMenu
        id="owned-listings-sort"
        name="sort"
        className="owned-listings-sort"
        label={t("ownedListingSortLabel")}
        placeholder={t("ownedListingSortNewest")}
        options={[{ value: "newest", label: t("ownedListingSortNewest") }, { value: "oldest", label: t("ownedListingSortOldest") }]}
        value={sort}
        onChange={(value) => update("sort", value === "oldest" ? value : null)}
        hideLabel
        includeEmptyOption={false}
      />
      {allowCompletedFilter ? <Button
        variant="secondary"
        size="sm"
        pill
        className={`owned-listings-exclude${excludeCompleted ? " is-active" : ""}`}
        aria-pressed={excludeCompleted}
        onClick={() => update("excludeCompleted", excludeCompleted ? null : "1")}
      >{t("ownedListingExcludeCompleted")}</Button> : null}
    </div> : null}
  </>;
}
