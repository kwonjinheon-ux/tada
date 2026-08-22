import type { TranslationKey } from "@/components/LanguageProvider";
import type { BrowseSortOption } from "@/components/browse/BrowseResultsToolbar";

/** Market and its shop feeds sort the same way, so the list lives here once. */
export function marketSortOptions(t: (key: TranslationKey) => string): BrowseSortOption[] {
  const hotItemsLabel = t("market") === "마켓" ? "핫템" : "Hot items";
  return [
    { value: "newest", label: t("newest") },
    { value: "priceAsc", label: t("lowToHigh") },
    { value: "priceDesc", label: t("highToLow") },
    { value: "hot", label: hotItemsLabel },
  ];
}
