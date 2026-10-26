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

export function OwnedListingsViewControls({ sort }: { sort: "newest" | "oldest" }) {
  const { t } = useLanguage();
  const update = useUpdateOwnedListingsQuery();

  return <SelectMenu
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
  />;
}

export function OwnedListingsCompletedFilter({ excludeCompleted }: { excludeCompleted: boolean }) {
  const { t } = useLanguage();
  const update = useUpdateOwnedListingsQuery();

  return <div className="owned-listings-status-filter">
    <Button
      variant="secondary"
      size="sm"
      pill
      className={`owned-listings-exclude${excludeCompleted ? " is-active" : ""}`}
      aria-pressed={excludeCompleted}
      onClick={() => update("excludeCompleted", excludeCompleted ? null : "1")}
    >{t("ownedListingExcludeCompleted")}</Button>
  </div>;
}
