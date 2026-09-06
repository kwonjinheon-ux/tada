"use client";

import { ProductCard } from "@/components/ProductCard";
import type { Listing } from "@/data/listings";
import { useLanguage } from "@/components/LanguageProvider";

export function RelatedListings({ listings, savedListingIds = [] }: { listings: Listing[]; savedListingIds?: string[] }) {
  const { t } = useLanguage();
  if (!listings.length) return null;

  const savedIds = new Set(savedListingIds);
  return (
    <section className="related-listings" aria-labelledby="related-listings-title">
      <div className="related-listings-heading"><div><p>{t("marketMoreToExplore")}</p><h2 id="related-listings-title">{t("marketMoreInCategory")}</h2></div></div>
      <div className="product-grid related-listings-grid">
        {listings.map((listing, index) => <ProductCard key={listing.id} listing={listing} priority={index < 2} initialIsSaved={savedIds.has(listing.id)} />)}
      </div>
    </section>
  );
}
