import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";

export function SearchNoResults() {
  const { t } = useLanguage();

  return <section className="global-search-no-results" aria-live="polite">
    <Image src="/images/search/no-search-results.png" alt="" width={1133} height={1280} priority />
    <div>
      <h2>{t("noMatchingListings")}</h2>
      <p>{t("tryDifferentSearch")}</p>
    </div>
  </section>;
}
