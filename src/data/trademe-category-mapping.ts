export type TradeMeCategoryMapping = {
  /** Trade Me's public root category number, including its trailing dash. */
  sourceCategoryNumber: string;
  sourceCategory: string;
  tadaCategory: string;
  /** Search terms added to Tada's existing category matching. */
  keywords: readonly string[];
  /** Official public API leaf count captured on 2 August 2026. */
  leafCategoryCount: number;
};

// Trade Me's public category catalogue is used as a taxonomy reference only.
// Listing data is deliberately not imported or scraped.
export const tradeMeCategoryMappings: readonly TradeMeCategoryMapping[] = [
  { sourceCategoryNumber: "0344-", sourceCategory: "Mobile phones", tadaCategory: "mobile-phones-tablets", keywords: ["mobile phones", "smartphones", "cellphones", "phone accessories"], leafCategoryCount: 165 },
  { sourceCategoryNumber: "0002-", sourceCategory: "Computers", tadaCategory: "computers-laptops", keywords: ["computers", "computer hardware", "computer peripherals", "software"], leafCategoryCount: 193 },
  { sourceCategoryNumber: "0124-", sourceCategory: "Electronics & photography", tadaCategory: "electronics-appliances", keywords: ["electronics", "photography", "consumer electronics", "home appliances"], leafCategoryCount: 219 },
  { sourceCategoryNumber: "0004-", sourceCategory: "Home & living", tadaCategory: "furniture-home-decor", keywords: ["home living", "home decor", "furniture", "household furniture"], leafCategoryCount: 581 },
  { sourceCategoryNumber: "5964-", sourceCategory: "Building & renovation", tadaCategory: "garden-tools-diy", keywords: ["building renovation", "building supplies", "renovation", "hardware"], leafCategoryCount: 155 },
  { sourceCategoryNumber: "0010-", sourceCategory: "Business, farming & industry", tadaCategory: "garden-tools-diy", keywords: ["farming", "farm equipment", "gardening", "industrial tools"], leafCategoryCount: 287 },
  { sourceCategoryNumber: "0153-", sourceCategory: "Clothing & Fashion", tadaCategory: "clothing-fashion", keywords: ["clothing fashion", "apparel", "fashion accessories", "footwear"], leafCategoryCount: 143 },
  { sourceCategoryNumber: "0246-", sourceCategory: "Jewellery & watches", tadaCategory: "clothing-fashion", keywords: ["jewellery watches", "jewelry", "watches", "fashion jewellery"], leafCategoryCount: 114 },
  { sourceCategoryNumber: "0351-", sourceCategory: "Baby gear", tadaCategory: "baby-kids", keywords: ["baby gear", "nursery", "baby equipment", "child safety"], leafCategoryCount: 193 },
  { sourceCategoryNumber: "0193-", sourceCategory: "Books", tadaCategory: "books-music-media", keywords: ["books", "magazines", "textbooks", "printed media"], leafCategoryCount: 379 },
  { sourceCategoryNumber: "0003-", sourceCategory: "Movies & TV", tadaCategory: "books-music-media", keywords: ["movies tv", "film", "television media", "blu ray"], leafCategoryCount: 70 },
  { sourceCategoryNumber: "0187-", sourceCategory: "Antiques & collectables", tadaCategory: "hobbies-collectables", keywords: ["antiques collectables", "collectibles", "memorabilia", "vintage collectables"], leafCategoryCount: 175 },
  { sourceCategoryNumber: "0339-", sourceCategory: "Art", tadaCategory: "hobbies-collectables", keywords: ["art", "fine art", "artwork", "prints"], leafCategoryCount: 68 },
  { sourceCategoryNumber: "0341-", sourceCategory: "Crafts", tadaCategory: "hobbies-collectables", keywords: ["crafts", "craft supplies", "crafting", "hobby supplies"], leafCategoryCount: 144 },
  { sourceCategoryNumber: "0340-", sourceCategory: "Pottery & glass", tadaCategory: "hobbies-collectables", keywords: ["pottery glass", "ceramics", "glassware", "porcelain"], leafCategoryCount: 100 },
  { sourceCategoryNumber: "0202-", sourceCategory: "Gaming", tadaCategory: "games-toys", keywords: ["gaming", "video gaming", "game consoles", "gaming accessories"], leafCategoryCount: 180 },
  { sourceCategoryNumber: "0347-", sourceCategory: "Toys & models", tadaCategory: "games-toys", keywords: ["toys models", "toys", "models", "model toys"], leafCategoryCount: 337 },
  { sourceCategoryNumber: "0005-", sourceCategory: "Sports", tadaCategory: "sports-leisure", keywords: ["sports", "outdoor recreation", "fitness sports", "sports equipment"], leafCategoryCount: 535 },
  { sourceCategoryNumber: "0343-", sourceCategory: "Music & instruments", tadaCategory: "musical-instruments", keywords: ["music instruments", "musical instruments", "music equipment", "recording equipment"], leafCategoryCount: 343 },
  { sourceCategoryNumber: "9425-", sourceCategory: "Pets & animals", tadaCategory: "pet-supplies", keywords: ["pets animals", "pet supplies", "animal supplies", "pet care"], leafCategoryCount: 78 },
  { sourceCategoryNumber: "4798-", sourceCategory: "Health & beauty", tadaCategory: "health-beauty", keywords: ["health beauty", "personal care", "beauty products", "wellbeing"], leafCategoryCount: 258 },
];

export const tradeMeMappedLeafCategoryCount = tradeMeCategoryMappings.reduce(
  (total, mapping) => total + mapping.leafCategoryCount,
  0,
);

export const tradeMeMappedKeywordCount = new Set(
  tradeMeCategoryMappings.flatMap((mapping) => mapping.keywords.map((keyword) => keyword.toLocaleLowerCase())),
).size;

const toTradeMePathSegment = (value: string) => value
  .trim()
  .toLocaleLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, "-")
  .replace(/^-|-$/g, "");

export function getTradeMeKeywordsForCategory(tadaCategory: string) {
  return tradeMeCategoryMappings
    .filter((mapping) => mapping.tadaCategory === tadaCategory)
    .flatMap((mapping) => mapping.keywords);
}

/** Maps every descendant of a supported public Trade Me root to Tada's current category taxonomy. */
export function resolveTadaCategoryFromTradeMePath(path: string) {
  const normalizedPath = path.trim().toLocaleLowerCase();
  const mapping = tradeMeCategoryMappings.find((candidate) => normalizedPath.startsWith(`/${toTradeMePathSegment(candidate.sourceCategory)}`));
  if (!mapping) return null;

  const isHomeKitchenPath = mapping.sourceCategoryNumber === "0004-"
    && /\/(?:kitchen|dining|cookware|tableware|barware|food|drink|appliances|storage)(?:\/|$)/i.test(path);
  return isHomeKitchenPath ? "home-kitchen" : mapping.tadaCategory;
}
