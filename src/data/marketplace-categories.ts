export type MarketplaceSubcategory = {
  label: string;
  value: string;
  keywords: string[];
};

export type MarketplaceCategory = {
  label: string;
  value: string;
  keywords: string[];
  subcategories: MarketplaceSubcategory[];
};

export const marketplaceCategories: MarketplaceCategory[] = [
  {
    label: "Electronics",
    value: "electronics",
    keywords: ["phone", "iphone", "samsung", "laptop", "computer", "tablet", "camera", "headphones", "tv", "console", "playstation", "xbox"],
    subcategories: [
      { label: "Mobile phones", value: "mobile-phones", keywords: ["phone", "iphone", "samsung", "pixel", "mobile"] },
      { label: "Computers", value: "computers", keywords: ["computer", "pc", "desktop", "monitor", "keyboard", "mouse"] },
      { label: "Laptops", value: "laptops", keywords: ["laptop", "macbook", "notebook"] },
      { label: "Tablets", value: "tablets", keywords: ["tablet", "ipad", "galaxy tab"] },
      { label: "Audio", value: "audio", keywords: ["headphones", "earbuds", "speaker", "audio", "soundbar"] },
      { label: "Cameras", value: "cameras", keywords: ["camera", "canon", "nikon", "sony", "lens", "gopro"] },
      { label: "TV & home theatre", value: "tv-home-theatre", keywords: ["tv", "television", "projector", "home theatre"] },
      { label: "Gaming", value: "gaming", keywords: ["playstation", "xbox", "nintendo", "console", "gaming"] },
    ],
  },
  {
    label: "Home & Garden",
    value: "home-garden",
    keywords: ["sofa", "table", "chair", "bed", "mattress", "fridge", "washing", "garden", "tools", "bbq", "furniture"],
    subcategories: [
      { label: "Furniture", value: "furniture", keywords: ["sofa", "couch", "table", "chair", "desk", "dresser", "cabinet"] },
      { label: "Beds & mattresses", value: "beds-mattresses", keywords: ["bed", "mattress", "queen", "king", "bunk"] },
      { label: "Appliances", value: "appliances", keywords: ["fridge", "freezer", "washing", "dryer", "dishwasher", "microwave"] },
      { label: "Kitchenware", value: "kitchenware", keywords: ["kitchen", "pan", "pot", "plates", "cutlery"] },
      { label: "Garden & outdoor", value: "garden-outdoor", keywords: ["garden", "outdoor", "lawn", "mower", "plants", "bbq"] },
      { label: "Tools & DIY", value: "tools-diy", keywords: ["tool", "drill", "saw", "ladder", "diy"] },
      { label: "Home decor", value: "home-decor", keywords: ["decor", "rug", "lamp", "curtain", "mirror", "art"] },
    ],
  },
  {
    label: "Clothing & Fashion",
    value: "clothing-fashion",
    keywords: ["clothes", "dress", "jacket", "shoes", "sneakers", "watch", "bag", "handbag", "fashion"],
    subcategories: [
      { label: "Women", value: "women", keywords: ["women", "dress", "skirt", "heels", "blouse"] },
      { label: "Men", value: "men", keywords: ["men", "shirt", "suit", "jacket", "jeans"] },
      { label: "Shoes", value: "shoes", keywords: ["shoes", "sneakers", "boots", "heels", "nike", "adidas"] },
      { label: "Bags & luggage", value: "bags-luggage", keywords: ["bag", "handbag", "backpack", "luggage", "suitcase"] },
      { label: "Jewellery & watches", value: "jewellery-watches", keywords: ["jewellery", "ring", "necklace", "watch", "bracelet"] },
      { label: "Kids clothing", value: "kids-clothing", keywords: ["kids", "baby clothes", "children"] },
    ],
  },
  {
    label: "Baby & Kids",
    value: "baby-kids",
    keywords: ["baby", "kids", "child", "stroller", "pram", "cot", "car seat", "toys"],
    subcategories: [
      { label: "Prams & strollers", value: "prams-strollers", keywords: ["pram", "stroller", "buggy"] },
      { label: "Car seats", value: "car-seats", keywords: ["car seat", "booster"] },
      { label: "Cots & nursery", value: "cots-nursery", keywords: ["cot", "bassinet", "nursery"] },
      { label: "Toys", value: "kids-toys", keywords: ["toy", "lego", "doll", "kids toys"] },
      { label: "Baby clothing", value: "baby-clothing", keywords: ["baby clothes", "onesie", "infant"] },
    ],
  },
  {
    label: "Sports & Outdoors",
    value: "sports-outdoors",
    keywords: ["bike", "bicycle", "gym", "fitness", "camping", "fishing", "golf", "surf", "sports"],
    subcategories: [
      { label: "Bikes", value: "bikes", keywords: ["bike", "bicycle", "mountain bike", "road bike"] },
      { label: "Fitness & gym", value: "fitness-gym", keywords: ["gym", "fitness", "weights", "treadmill"] },
      { label: "Camping & hiking", value: "camping-hiking", keywords: ["camping", "tent", "hiking", "backpack"] },
      { label: "Fishing", value: "fishing", keywords: ["fishing", "rod", "reel"] },
      { label: "Water sports", value: "water-sports", keywords: ["surf", "kayak", "paddleboard", "wetsuit"] },
      { label: "Team sports", value: "team-sports", keywords: ["rugby", "football", "soccer", "basketball"] },
    ],
  },
  {
    label: "Toys, Games & Hobbies",
    value: "toys-games-hobbies",
    keywords: ["toy", "lego", "board game", "puzzle", "model", "craft", "hobby"],
    subcategories: [
      { label: "Toys", value: "toys", keywords: ["toy", "doll", "lego", "blocks"] },
      { label: "Board games & puzzles", value: "board-games-puzzles", keywords: ["board game", "puzzle", "cards"] },
      { label: "Models", value: "models", keywords: ["model", "rc", "remote control"] },
      { label: "Crafts", value: "crafts", keywords: ["craft", "sewing", "knitting", "fabric"] },
      { label: "Musical instruments", value: "musical-instruments", keywords: ["guitar", "piano", "keyboard", "drums", "instrument"] },
    ],
  },
  {
    label: "Books, Movies & Music",
    value: "books-movies-music",
    keywords: ["book", "dvd", "vinyl", "record", "cd", "movie", "music"],
    subcategories: [
      { label: "Books", value: "books", keywords: ["book", "novel", "textbook"] },
      { label: "Movies", value: "movies", keywords: ["dvd", "blu-ray", "movie"] },
      { label: "Music", value: "music", keywords: ["cd", "vinyl", "record", "album"] },
      { label: "Magazines", value: "magazines", keywords: ["magazine", "comic"] },
    ],
  },
  {
    label: "Health & Beauty",
    value: "health-beauty",
    keywords: ["beauty", "makeup", "skincare", "perfume", "health", "fitness tracker"],
    subcategories: [
      { label: "Makeup", value: "makeup", keywords: ["makeup", "lipstick", "foundation"] },
      { label: "Skincare", value: "skincare", keywords: ["skincare", "cream", "serum"] },
      { label: "Hair care", value: "hair-care", keywords: ["hair", "dryer", "straightener"] },
      { label: "Fragrance", value: "fragrance", keywords: ["perfume", "cologne", "fragrance"] },
      { label: "Health equipment", value: "health-equipment", keywords: ["health", "mobility", "wheelchair", "walker"] },
    ],
  },
  {
    label: "Antiques & Collectables",
    value: "antiques-collectables",
    keywords: ["antique", "vintage", "collectable", "coin", "stamp", "memorabilia"],
    subcategories: [
      { label: "Antiques", value: "antiques", keywords: ["antique", "old", "vintage"] },
      { label: "Collectables", value: "collectables", keywords: ["collectable", "memorabilia"] },
      { label: "Coins", value: "coins", keywords: ["coin", "currency"] },
      { label: "Stamps", value: "stamps", keywords: ["stamp"] },
      { label: "Art", value: "art", keywords: ["art", "painting", "print"] },
    ],
  },
  {
    label: "Business, Farming & Industry",
    value: "business-farming-industry",
    keywords: ["business", "office", "farming", "tractor", "industrial", "commercial", "equipment"],
    subcategories: [
      { label: "Office equipment", value: "office-equipment", keywords: ["office", "printer", "desk", "chair"] },
      { label: "Farming equipment", value: "farming-equipment", keywords: ["farm", "tractor", "livestock", "farming"] },
      { label: "Industrial tools", value: "industrial-tools", keywords: ["industrial", "workshop", "compressor"] },
      { label: "Commercial kitchen", value: "commercial-kitchen", keywords: ["commercial kitchen", "cafe", "restaurant"] },
    ],
  },
  {
    label: "Pets & Animals",
    value: "pets-animals",
    keywords: ["pet", "dog", "cat", "fish", "bird", "animal", "kennel", "crate"],
    subcategories: [
      { label: "Dogs", value: "dogs", keywords: ["dog", "puppy", "kennel"] },
      { label: "Cats", value: "cats", keywords: ["cat", "kitten"] },
      { label: "Fish", value: "fish", keywords: ["fish", "aquarium", "tank"] },
      { label: "Birds", value: "birds", keywords: ["bird", "cage"] },
      { label: "Pet supplies", value: "pet-supplies", keywords: ["pet", "crate", "leash", "food"] },
    ],
  },
  {
    label: "Vehicles",
    value: "vehicles",
    keywords: ["car", "vehicle", "van", "ute", "motorbike", "boat", "trailer", "parts"],
    subcategories: [
      { label: "Cars", value: "cars", keywords: ["car", "toyota", "honda", "mazda", "bmw"] },
      { label: "Motorbikes", value: "motorbikes", keywords: ["motorbike", "motorcycle", "scooter"] },
      { label: "Boats", value: "boats", keywords: ["boat", "jetski", "marine"] },
      { label: "Trailers", value: "trailers", keywords: ["trailer"] },
      { label: "Parts & accessories", value: "vehicle-parts-accessories", keywords: ["tyre", "wheel", "parts", "accessory"] },
    ],
  },
  {
    label: "Free Stuff",
    value: "free-stuff",
    keywords: ["free", "giveaway", "pickup free"],
    subcategories: [
      { label: "Free household items", value: "free-household-items", keywords: ["free", "household"] },
      { label: "Free furniture", value: "free-furniture", keywords: ["free sofa", "free table", "free furniture"] },
      { label: "Free garden items", value: "free-garden-items", keywords: ["free garden", "plants"] },
    ],
  },
];

export function getSubcategories(mainCategory: string) {
  return marketplaceCategories.find((category) => category.value === mainCategory)?.subcategories ?? [];
}

export function suggestCategoryFromTitle(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.trim().length < 3) {
    return null;
  }

  let bestMatch: { mainCategory: string; subCategory: string; score: number } | null = null;

  for (const category of marketplaceCategories) {
    let categoryScore = category.keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 2 : 0), 0);

    for (const subcategory of category.subcategories) {
      const subcategoryScore = subcategory.keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 3 : 0), 0);
      const score = categoryScore + subcategoryScore;

      if (score > (bestMatch?.score ?? 0)) {
        bestMatch = { mainCategory: category.value, subCategory: subcategory.value, score };
      }
    }

    if (!category.subcategories.length && categoryScore > (bestMatch?.score ?? 0)) {
      bestMatch = { mainCategory: category.value, subCategory: "", score: categoryScore };
    }
  }

  return bestMatch && bestMatch.score > 0 ? bestMatch : null;
}
