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

/**
 * A path-aware mapping from Trade Me public taxonomy terms to Tada's leaf
 * categories.  `matches` are intentionally broad path fragments rather than
 * imported listing terms, so the mapping stays stable when Trade Me adds a
 * leaf below an existing branch.
 */
export type TradeMeSubcategoryMapping = {
  tadaCategory: string;
  tadaSubcategory: string;
  matches: readonly string[];
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

// These rules cover the product branches exposed by Trade Me.  A matching
// leaf is always assigned to a Tada subcategory; an explicit "Other" leaf is
// used only when its public path does not yet have a more precise home.
export const tradeMeSubcategoryMappings: readonly TradeMeSubcategoryMapping[] = [
  { tadaCategory: "mobile-phones-tablets", tadaSubcategory: "mobile-phones", matches: ["mobile phone", "smartphone", "iphone", "android phone"] },
  { tadaCategory: "mobile-phones-tablets", tadaSubcategory: "tablets", matches: ["tablet", "ipad", "e-reader"] },
  { tadaCategory: "mobile-phones-tablets", tadaSubcategory: "smartwatches", matches: ["smart watch", "wearable", "fitness tracker"] },
  { tadaCategory: "mobile-phones-tablets", tadaSubcategory: "phone-cases", matches: ["case", "cover", "screen protector"] },
  { tadaCategory: "mobile-phones-tablets", tadaSubcategory: "chargers-cables", matches: ["charger", "cable", "adapter", "dock"] },
  { tadaCategory: "mobile-phones-tablets", tadaSubcategory: "power-banks", matches: ["power bank", "battery"] },
  { tadaCategory: "mobile-phones-tablets", tadaSubcategory: "earphones-headsets", matches: ["headphone", "headset", "earphone", "earbud"] },
  { tadaCategory: "mobile-phones-tablets", tadaSubcategory: "mobile-accessories", matches: ["accessor", "car mount", "stylus", "replacement part"] },

  { tadaCategory: "computers-laptops", tadaSubcategory: "laptops", matches: ["laptop", "notebook", "macbook", "chromebook"] },
  { tadaCategory: "computers-laptops", tadaSubcategory: "desktop-computers", matches: ["desktop", "tower", "all in one", "mini pc"] },
  { tadaCategory: "computers-laptops", tadaSubcategory: "monitors", matches: ["monitor", "display"] },
  { tadaCategory: "computers-laptops", tadaSubcategory: "computer-components", matches: ["component", "graphics card", "motherboard", "processor", "memory", "ram"] },
  { tadaCategory: "computers-laptops", tadaSubcategory: "keyboards", matches: ["keyboard"] },
  { tadaCategory: "computers-laptops", tadaSubcategory: "mice-mouse-pads", matches: ["mouse", "trackball", "mouse pad"] },
  { tadaCategory: "computers-laptops", tadaSubcategory: "printers-scanners", matches: ["printer", "scanner", "ink", "toner"] },
  { tadaCategory: "computers-laptops", tadaSubcategory: "networking-equipment", matches: ["network", "router", "modem", "wireless", "wifi"] },
  { tadaCategory: "computers-laptops", tadaSubcategory: "storage-devices", matches: ["storage", "hard drive", "ssd", "usb", "memory card"] },
  { tadaCategory: "computers-laptops", tadaSubcategory: "software-computer-games", matches: ["software", "computer game", "operating system"] },

  { tadaCategory: "electronics-appliances", tadaSubcategory: "televisions", matches: ["television", "tv", "projector"] },
  { tadaCategory: "electronics-appliances", tadaSubcategory: "audio-equipment", matches: ["audio", "speaker", "stereo", "amplifier", "radio"] },
  { tadaCategory: "electronics-appliances", tadaSubcategory: "cameras", matches: ["camera", "photography"] },
  { tadaCategory: "electronics-appliances", tadaSubcategory: "camera-accessories", matches: ["lens", "tripod", "camera accessory", "flash"] },
  { tadaCategory: "electronics-appliances", tadaSubcategory: "drones", matches: ["drone"] },
  { tadaCategory: "electronics-appliances", tadaSubcategory: "refrigerators-freezers", matches: ["refrigerator", "fridge", "freezer"] },
  { tadaCategory: "electronics-appliances", tadaSubcategory: "washing-machines-dryers", matches: ["washing", "dryer", "laundry"] },
  { tadaCategory: "electronics-appliances", tadaSubcategory: "small-kitchen-appliances", matches: ["kitchen appliance", "microwave", "oven", "toaster", "blender"] },
  { tadaCategory: "electronics-appliances", tadaSubcategory: "coffee-machines", matches: ["coffee", "espresso"] },
  { tadaCategory: "electronics-appliances", tadaSubcategory: "heating-cooling", matches: ["heating", "heater", "cooling", "air conditioner", "fan"] },
  { tadaCategory: "electronics-appliances", tadaSubcategory: "smart-home-security", matches: ["security", "alarm", "smart home", "intercom"] },
  { tadaCategory: "electronics-appliances", tadaSubcategory: "gps-navigation", matches: ["gps", "navigation"] },

  { tadaCategory: "furniture-home-decor", tadaSubcategory: "sofas-lounge-suites", matches: ["sofa", "lounge", "recliner"] },
  { tadaCategory: "furniture-home-decor", tadaSubcategory: "beds-bed-frames", matches: ["bed", "bedroom furniture"] },
  { tadaCategory: "furniture-home-decor", tadaSubcategory: "mattresses", matches: ["mattress"] },
  { tadaCategory: "furniture-home-decor", tadaSubcategory: "dining-tables-chairs", matches: ["dining", "table", "chair"] },
  { tadaCategory: "furniture-home-decor", tadaSubcategory: "desks-office-furniture", matches: ["office", "desk", "study"] },
  { tadaCategory: "furniture-home-decor", tadaSubcategory: "wardrobes-drawers", matches: ["wardrobe", "drawer", "cabinet"] },
  { tadaCategory: "furniture-home-decor", tadaSubcategory: "lighting", matches: ["lighting", "lamp", "light"] },
  { tadaCategory: "furniture-home-decor", tadaSubcategory: "rugs-curtains-blinds", matches: ["rug", "carpet", "curtain", "blind"] },
  { tadaCategory: "furniture-home-decor", tadaSubcategory: "wall-art-decorations", matches: ["mirror", "wall art", "decoration", "ornament"] },
  { tadaCategory: "furniture-home-decor", tadaSubcategory: "outdoor-furniture", matches: ["outdoor furniture", "patio", "garden furniture"] },

  { tadaCategory: "home-kitchen", tadaSubcategory: "cookware", matches: ["cookware", "pot", "pan", "wok"] },
  { tadaCategory: "home-kitchen", tadaSubcategory: "bakeware", matches: ["bakeware", "baking"] },
  { tadaCategory: "home-kitchen", tadaSubcategory: "tableware-cutlery", matches: ["tableware", "dinnerware", "cutlery"] },
  { tadaCategory: "home-kitchen", tadaSubcategory: "kitchen-utensils", matches: ["utensil", "knife", "kitchen tool"] },
  { tadaCategory: "home-kitchen", tadaSubcategory: "food-storage-drinkware", matches: ["food storage", "drinkware", "bottle", "tumbler"] },
  { tadaCategory: "home-kitchen", tadaSubcategory: "bedding", matches: ["bedding", "linen", "blanket", "pillow"] },
  { tadaCategory: "home-kitchen", tadaSubcategory: "towels-bathroom", matches: ["bathroom", "towel", "bath"] },
  { tadaCategory: "home-kitchen", tadaSubcategory: "storage-organisation", matches: ["storage", "organisation", "organizer"] },

  { tadaCategory: "clothing-fashion", tadaSubcategory: "womens-clothing", matches: ["women", "ladies"] },
  { tadaCategory: "clothing-fashion", tadaSubcategory: "mens-clothing", matches: ["men", "mens"] },
  { tadaCategory: "clothing-fashion", tadaSubcategory: "childrens-clothing", matches: ["children", "kids clothing"] },
  { tadaCategory: "clothing-fashion", tadaSubcategory: "shoes", matches: ["shoe", "boot", "sandal", "footwear"] },
  { tadaCategory: "clothing-fashion", tadaSubcategory: "bags-handbags", matches: ["bag", "handbag", "backpack"] },
  { tadaCategory: "clothing-fashion", tadaSubcategory: "jewellery", matches: ["jewellery", "jewelry", "ring", "necklace"] },
  { tadaCategory: "clothing-fashion", tadaSubcategory: "watches", matches: ["watch"] },
  { tadaCategory: "clothing-fashion", tadaSubcategory: "fashion-accessories-luggage", matches: ["accessor", "luggage", "wallet", "belt", "hat"] },
  { tadaCategory: "clothing-fashion", tadaSubcategory: "sportswear-workwear", matches: ["sportswear", "activewear", "workwear", "uniform", "hi vis", "hi-vis"] },

  { tadaCategory: "baby-kids", tadaSubcategory: "prams-strollers", matches: ["pram", "stroller", "buggy"] },
  { tadaCategory: "baby-kids", tadaSubcategory: "car-seats-capsules", matches: ["car seat", "capsule", "booster"] },
  { tadaCategory: "baby-kids", tadaSubcategory: "cots-bassinets", matches: ["cot", "bassinet", "nursery furniture"] },
  { tadaCategory: "baby-kids", tadaSubcategory: "high-chairs-feeding", matches: ["feeding", "high chair", "bottle"] },
  { tadaCategory: "baby-kids", tadaSubcategory: "baby-clothing", matches: ["baby clothing", "baby clothes"] },
  { tadaCategory: "baby-kids", tadaSubcategory: "baby-safety-monitors", matches: ["safety", "monitor", "gate"] },
  { tadaCategory: "baby-kids", tadaSubcategory: "educational-toys", matches: ["educational", "learning", "school"] },
  { tadaCategory: "baby-kids", tadaSubcategory: "kids-toys-play", matches: ["toy", "play", "doll"] },
  { tadaCategory: "baby-kids", tadaSubcategory: "kids-bikes-scooters", matches: ["bike", "bicycle", "scooter", "tricycle", "ride on", "ride-on"] },

  { tadaCategory: "books-music-media", tadaSubcategory: "childrens-books-textbooks", matches: ["children", "textbook", "education"] },
  { tadaCategory: "books-music-media", tadaSubcategory: "fiction-nonfiction-books", matches: ["fiction", "non fiction", "non-fiction", "literature", "novel", "book"] },
  { tadaCategory: "books-music-media", tadaSubcategory: "specialty-books", matches: ["reference", "religion", "history", "science", "business"] },
  { tadaCategory: "books-music-media", tadaSubcategory: "language-art-cookbooks", matches: ["language", "art book", "cookbook"] },
  { tadaCategory: "books-music-media", tadaSubcategory: "comics-manga", matches: ["comic", "manga"] },
  { tadaCategory: "books-music-media", tadaSubcategory: "vinyl-records-cds", matches: ["vinyl", "record", "cd"] },
  { tadaCategory: "books-music-media", tadaSubcategory: "dvds-blu-rays", matches: ["dvd", "blu ray", "blu-ray"] },
  { tadaCategory: "books-music-media", tadaSubcategory: "stationery-journals", matches: ["stationery", "journal", "notebook"] },
  { tadaCategory: "books-music-media", tadaSubcategory: "magazines-newspapers", matches: ["magazine", "newspaper"] },

  { tadaCategory: "hobbies-collectables", tadaSubcategory: "antiques", matches: ["antique", "vintage"] },
  { tadaCategory: "hobbies-collectables", tadaSubcategory: "coins-banknotes-stamps", matches: ["coin", "banknote", "stamp"] },
  { tadaCategory: "hobbies-collectables", tadaSubcategory: "trading-cards", matches: ["trading card", "card collectible"] },
  { tadaCategory: "hobbies-collectables", tadaSubcategory: "collectable-figures-models", matches: ["figure", "model"] },
  { tadaCategory: "hobbies-collectables", tadaSubcategory: "art-craft-supplies", matches: ["art", "craft"] },
  { tadaCategory: "hobbies-collectables", tadaSubcategory: "sewing-knitting", matches: ["sewing", "knitting", "fabric", "yarn"] },
  { tadaCategory: "hobbies-collectables", tadaSubcategory: "memorabilia-militaria", matches: ["memorabilia", "militaria", "historical"] },
  { tadaCategory: "hobbies-collectables", tadaSubcategory: "rc-models-science-kits", matches: ["remote control", "r/c", "rc model", "model kit", "science kit", "model train"] },

  { tadaCategory: "games-toys", tadaSubcategory: "gaming-consoles", matches: ["console", "playstation", "xbox", "nintendo"] },
  { tadaCategory: "games-toys", tadaSubcategory: "video-games", matches: ["video game", "game title"] },
  { tadaCategory: "games-toys", tadaSubcategory: "console-accessories", matches: ["controller", "gaming accessory"] },
  { tadaCategory: "games-toys", tadaSubcategory: "board-games-puzzles", matches: ["board game", "puzzle"] },
  { tadaCategory: "games-toys", tadaSubcategory: "lego-building-toys", matches: ["lego", "building"] },
  { tadaCategory: "games-toys", tadaSubcategory: "dolls-figures-soft-toys", matches: ["doll", "soft toy", "plush"] },
  { tadaCategory: "games-toys", tadaSubcategory: "toy-vehicles-ride-ons", matches: ["toy vehicle", "ride on"] },

  { tadaCategory: "sports-leisure", tadaSubcategory: "fitness-cardio-equipment", matches: ["fitness", "exercise", "gym"] },
  { tadaCategory: "sports-leisure", tadaSubcategory: "bicycles-accessories", matches: ["bicycle", "bike", "cycling"] },
  { tadaCategory: "sports-leisure", tadaSubcategory: "camping-hiking", matches: ["camping", "hiking", "tramping"] },
  { tadaCategory: "sports-leisure", tadaSubcategory: "fishing", matches: ["fishing"] },
  { tadaCategory: "sports-leisure", tadaSubcategory: "water-sports-swimming", matches: ["water sport", "swimming", "surf", "kayak"] },
  { tadaCategory: "sports-leisure", tadaSubcategory: "golf-racquet-sports", matches: ["golf", "tennis", "racquet"] },
  { tadaCategory: "sports-leisure", tadaSubcategory: "team-sports", matches: ["rugby", "football", "soccer", "cricket", "basketball"] },
  { tadaCategory: "sports-leisure", tadaSubcategory: "hunting-motorsport", matches: ["hunting", "motorsport", "motor sport"] },

  { tadaCategory: "musical-instruments", tadaSubcategory: "guitars-amplifiers", matches: ["guitar", "amplifier"] },
  { tadaCategory: "musical-instruments", tadaSubcategory: "pianos-keyboards", matches: ["piano", "keyboard", "synth"] },
  { tadaCategory: "musical-instruments", tadaSubcategory: "drums-percussion", matches: ["drum", "percussion"] },
  { tadaCategory: "musical-instruments", tadaSubcategory: "orchestral-instruments", matches: ["string", "brass", "woodwind", "orchestral"] },
  { tadaCategory: "musical-instruments", tadaSubcategory: "dj-pa-equipment", matches: ["dj", "pa equipment", "turntable"] },
  { tadaCategory: "musical-instruments", tadaSubcategory: "microphones-recording", matches: ["microphone", "recording", "studio"] },
  { tadaCategory: "musical-instruments", tadaSubcategory: "instrument-accessories", matches: ["instrument accessory", "music accessory", "sheet music"] },

  { tadaCategory: "garden-tools-diy", tadaSubcategory: "power-tools", matches: ["power tool", "drill", "saw"] },
  { tadaCategory: "garden-tools-diy", tadaSubcategory: "hand-tools-storage", matches: ["hand tool", "tool storage", "toolbox"] },
  { tadaCategory: "garden-tools-diy", tadaSubcategory: "lawn-garden-tools", matches: ["lawn", "garden tool", "mower"] },
  { tadaCategory: "garden-tools-diy", tadaSubcategory: "plants-planters", matches: ["plant", "planter", "seed"] },
  { tadaCategory: "garden-tools-diy", tadaSubcategory: "bbqs-outdoor-cooking", matches: ["bbq", "barbecue", "outdoor cooking"] },
  { tadaCategory: "garden-tools-diy", tadaSubcategory: "building-materials-diy", matches: ["building", "renovation", "timber", "flooring"] },
  { tadaCategory: "garden-tools-diy", tadaSubcategory: "farm-industrial-equipment", matches: ["farm", "industrial", "agriculture"] },

  { tadaCategory: "pet-supplies", tadaSubcategory: "dog-supplies", matches: ["dog"] },
  { tadaCategory: "pet-supplies", tadaSubcategory: "cat-supplies", matches: ["cat"] },
  { tadaCategory: "pet-supplies", tadaSubcategory: "pet-food-feeders", matches: ["food", "feeder"] },
  { tadaCategory: "pet-supplies", tadaSubcategory: "pet-crates-bedding", matches: ["crate", "carrier", "bedding"] },
  { tadaCategory: "pet-supplies", tadaSubcategory: "pet-grooming-training", matches: ["grooming", "training"] },
  { tadaCategory: "pet-supplies", tadaSubcategory: "small-pet-supplies", matches: ["aquarium", "fish", "bird", "small animal"] },

  { tadaCategory: "health-beauty", tadaSubcategory: "skincare", matches: ["skincare", "skin care"] },
  { tadaCategory: "health-beauty", tadaSubcategory: "make-up", matches: ["makeup", "make-up", "cosmetic"] },
  { tadaCategory: "health-beauty", tadaSubcategory: "haircare-styling-tools", matches: ["hair", "styling"] },
  { tadaCategory: "health-beauty", tadaSubcategory: "perfume-fragrance", matches: ["perfume", "fragrance"] },
  { tadaCategory: "health-beauty", tadaSubcategory: "personal-care-devices", matches: ["personal care", "shaver", "toothbrush"] },
  { tadaCategory: "health-beauty", tadaSubcategory: "mobility-daily-living-aids", matches: ["mobility", "daily living", "wheelchair"] },
  { tadaCategory: "health-beauty", tadaSubcategory: "health-wellness", matches: ["health", "wellness", "supplement", "medical"] },
];

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

/** Returns taxonomy aliases for a concrete Tada subcategory. */
export function getTradeMeKeywordsForSubcategory(tadaCategory: string, tadaSubcategory: string) {
  return tradeMeSubcategoryMappings
    .filter((mapping) => mapping.tadaCategory === tadaCategory && mapping.tadaSubcategory === tadaSubcategory)
    .flatMap((mapping) => mapping.matches);
}

/** Maps every descendant of a supported public Trade Me root to Tada's current category taxonomy. */
export function resolveTadaCategoryFromTradeMePath(path: string) {
  const normalizedPath = toTradeMePathSegment(path);
  const mapping = tradeMeCategoryMappings.find((candidate) => {
    const root = toTradeMePathSegment(candidate.sourceCategory);
    return normalizedPath === root || normalizedPath.startsWith(`${root}-`);
  });
  if (!mapping) return null;

  const isHomeKitchenPath = mapping.sourceCategoryNumber === "0004-"
    && /(?:^|-)(?:kitchen|dining|cookware|tableware|barware|food|drink|appliances|storage|bedding|bathroom)(?:-|$)/.test(normalizedPath);
  return isHomeKitchenPath ? "home-kitchen" : mapping.tadaCategory;
}

/** Resolves every supported public Trade Me leaf to a Tada subcategory. */
export function resolveTadaSubcategoryFromTradeMePath(path: string, resolvedCategory?: string | null) {
  const tadaCategory = resolvedCategory ?? resolveTadaCategoryFromTradeMePath(path);
  if (!tadaCategory) return null;

  const normalizedPath = path.trim().toLocaleLowerCase();
  const match = tradeMeSubcategoryMappings
    .filter((mapping) => mapping.tadaCategory === tadaCategory)
    .map((mapping) => ({
      mapping,
      score: mapping.matches.reduce(
        (total, term) => total + (normalizedPath.includes(term.toLocaleLowerCase()) ? term.length : 0),
        0,
      ),
    }))
    .sort((left, right) => right.score - left.score)[0];

  return match?.score ? match.mapping.tadaSubcategory : `other-${tadaCategory}`;
}
