"use client";

import { marketplaceCategories } from "@/data/marketplace-categories";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";

export const marketCategoryIcons: Record<string, string> = {
  "mobile-phones-tablets": "fa-mobile-screen-button",
  "computers-laptops": "fa-laptop",
  "electronics-appliances": "fa-tv",
  "furniture-home-decor": "fa-couch",
  "home-kitchen": "fa-kitchen-set",
  "clothing-fashion": "fa-shirt",
  "baby-kids": "fa-baby",
  "books-music-media": "fa-book-open",
  "hobbies-collectables": "fa-gem",
  "games-toys": "fa-gamepad",
  "sports-leisure": "fa-futbol",
  "musical-instruments": "fa-guitar",
  "garden-tools-diy": "fa-screwdriver-wrench",
  "pet-supplies": "fa-paw",
  "health-beauty": "fa-heart-pulse",
};

export const marketCategoryLabelKeys: Record<string, TranslationKey> = {
  "mobile-phones-tablets": "marketCategoryMobilePhonesTablets",
  "computers-laptops": "marketCategoryComputersLaptops",
  "electronics-appliances": "marketCategoryElectronicsAppliances",
  "furniture-home-decor": "marketCategoryFurnitureHomeDecor",
  "home-kitchen": "marketCategoryHomeKitchen",
  "clothing-fashion": "marketCategoryClothingFashion",
  "baby-kids": "marketCategoryBabyKids",
  "books-music-media": "marketCategoryBooksMusicMedia",
  "hobbies-collectables": "marketCategoryHobbiesCollectables",
  "games-toys": "marketCategoryGamesToys",
  "sports-leisure": "marketCategorySportsLeisure",
  "musical-instruments": "marketCategoryMusicalInstruments",
  "garden-tools-diy": "marketCategoryGardenToolsDiy",
  "pet-supplies": "marketCategoryPetSupplies",
  "health-beauty": "marketCategoryHealthBeauty",
};

export function MarketCategoryGrid({ activeCategory, onCategorySelect }: { activeCategory: string; onCategorySelect: (categorySlug: string) => void }) {
  const { t } = useLanguage();

  return (
    <section className="market-mobile-category-section" aria-label={t("category")}>
      <div className="market-mobile-category-grid" role="group" aria-label={t("category")}>
        {marketplaceCategories.slice(0, 8).map(({ label, value }) => {
          const isActive = activeCategory === value;
          const labelKey = marketCategoryLabelKeys[value];

          return (
            <button key={value} className={`market-mobile-category ui-card ${isActive ? "is-active" : ""}`} type="button" aria-pressed={isActive} onClick={() => onCategorySelect(isActive ? "all" : value)}>
              <span className="market-mobile-category-icon"><i className={`fa-solid ${marketCategoryIcons[value]}`} aria-hidden="true" /></span>
              <strong>{labelKey ? t(labelKey) : label}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
