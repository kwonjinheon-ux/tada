"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { SelectMenu } from "@/components/ui/SelectMenu";

export function OwnedListingsViewControls({ sort, excludeCompleted }: { sort: "newest" | "oldest"; excludeCompleted: boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = (key: "sort" | "excludeCompleted", value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return <div className="owned-listings-view-controls">
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
