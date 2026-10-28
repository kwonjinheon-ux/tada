import {
  getTradeMeKeywordsForCategory,
  getTradeMeKeywordsForSubcategory,
  tradeMeMappedKeywordCount,
  tradeMeSubcategoryMappings,
} from "@/data/trademe-category-mapping";
import { categoryKeywordAdditions, subcategoryKeywordAdditions } from "@/data/marketplace-keywords-ko";

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

const titleFromSlug = (value: string) => value
  .split("-")
  .map((part) => part === "diy" ? "DIY" : part === "gps" ? "GPS" : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join(" ");

const additionsFor = (additions?: { ko: string[]; en?: string[] }) => [...(additions?.ko ?? []), ...(additions?.en ?? [])];

const category = (label: string, value: string, keywords: string[], subcategories: Array<[string, string, string[]]>): MarketplaceCategory => {
  const importedSubcategories = tradeMeSubcategoryMappings
    .filter((mapping) => mapping.tadaCategory === value)
    .map((mapping) => mapping.tadaSubcategory);
  const definedValues = new Set(subcategories.map(([, subcategoryValue]) => subcategoryValue));
  const generatedSubcategories = [...new Set(importedSubcategories)]
    .filter((subcategoryValue) => !definedValues.has(subcategoryValue))
    .map((subcategoryValue): [string, string, string[]] => [titleFromSlug(subcategoryValue), subcategoryValue, []]);
  const allSubcategories: Array<[string, string, string[]]> = [
    ...subcategories,
    ...generatedSubcategories,
    [`Other ${label}`, `other-${value}`, ["other", "miscellaneous"]],
  ];

  return {
    label,
    value,
    keywords: [...new Set([...keywords, ...getTradeMeKeywordsForCategory(value), ...additionsFor(categoryKeywordAdditions[value])])],
    subcategories: allSubcategories.map(([subcategoryLabel, subcategoryValue, subcategoryKeywords]) => ({
      label: subcategoryLabel,
      value: subcategoryValue,
      keywords: [...new Set([...subcategoryKeywords, ...getTradeMeKeywordsForSubcategory(value, subcategoryValue), ...additionsFor(subcategoryKeywordAdditions[subcategoryValue])])],
    })),
  };
};

// English labels and stable slugs are canonical. Keywords intentionally include common Korean terms for matching bilingual titles.
export const marketplaceCategories: MarketplaceCategory[] = [
  category("Mobile Phones & Tablets", "mobile-phones-tablets", ["phone", "iphone", "samsung", "tablet", "휴대폰", "핸드폰", "스마트폰", "아이폰", "태블릿"], [
    ["Mobile Phones", "mobile-phones", ["phone", "iphone", "galaxy", "pixel", "oppo", "xiaomi", "휴대폰", "핸드폰", "스마트폰", "아이폰"]],
    ["Tablets", "tablets", ["tablet", "ipad", "galaxy tab", "태블릿", "아이패드"]],
    ["Smartwatches", "smartwatches", ["apple watch", "galaxy watch", "fitbit", "garmin", "smartwatch", "스마트워치"]],
    ["Phone Cases", "phone-cases", ["phone case", "iphone case", "magsafe case", "폰케이스", "케이스"]],
    ["Chargers & Cables", "chargers-cables", ["charger", "charging cable", "usb-c", "lightning", "충전기", "충전 케이블"]],
    ["Power Banks", "power-banks", ["power bank", "battery pack", "보조배터리"]],
    ["Earphones & Headsets", "earphones-headsets", ["airpods", "galaxy buds", "earphones", "earbuds", "이어폰", "헤드셋"]],
    ["Tablet Accessories", "tablet-accessories", ["apple pencil", "stylus", "tablet keyboard", "스타일러스", "애플펜슬"]],
  ]),
  category("Computers & Laptops", "computers-laptops", ["laptop", "computer", "pc", "macbook", "노트북", "컴퓨터"], [
    ["Laptops", "laptops", ["laptop", "macbook", "chromebook", "gaming laptop", "노트북", "맥북"]],
    ["Desktop Computers", "desktop-computers", ["desktop", "gaming pc", "all in one", "mini pc", "데스크탑", "본체"]],
    ["Monitors", "monitors", ["monitor", "ultrawide", "gaming monitor", "모니터"]],
    ["Computer Components", "computer-components", ["cpu", "gpu", "graphics card", "ram", "motherboard", "ssd", "컴퓨터 부품", "그래픽카드"]],
    ["Keyboards", "keyboards", ["keyboard", "mechanical keyboard", "키보드"]],
    ["Mice & Mouse Pads", "mice-mouse-pads", ["mouse", "trackball", "mouse pad", "마우스"]],
    ["Printers & Scanners", "printers-scanners", ["printer", "scanner", "프린터", "스캐너"]],
    ["Networking Equipment", "networking-equipment", ["router", "modem", "mesh wifi", "network switch", "공유기", "라우터"]],
    ["Storage Devices", "storage-devices", ["external hard drive", "usb drive", "nas", "memory card", "외장하드", "usb"]],
  ]),
  category("Electronics & Appliances", "electronics-appliances", ["tv", "camera", "speaker", "fridge", "washing machine", "가전", "카메라", "냉장고"], [
    ["Televisions", "televisions", ["tv", "smart tv", "oled", "television", "티비"]],
    ["Audio Equipment", "audio-equipment", ["speaker", "amplifier", "receiver", "stereo", "스피커", "앰프"]],
    ["Cameras", "cameras", ["camera", "dslr", "mirrorless", "gopro", "카메라"]],
    ["Camera Lenses & Accessories", "camera-accessories", ["camera lens", "tripod", "gimbal", "flash", "렌즈", "삼각대"]],
    ["Drones", "drones", ["drone", "dji", "드론"]],
    ["Refrigerators & Freezers", "refrigerators-freezers", ["fridge", "refrigerator", "freezer", "냉장고", "냉동고"]],
    ["Washing Machines & Dryers", "washing-machines-dryers", ["washing machine", "dryer", "washer", "세탁기", "건조기"]],
    ["Small Kitchen Appliances", "small-kitchen-appliances", ["air fryer", "blender", "toaster", "rice cooker", "에어프라이어", "믹서기", "밥솥"]],
    ["Coffee Machines", "coffee-machines", ["coffee machine", "espresso", "grinder", "커피머신", "에스프레소"]],
    ["Heating & Cooling", "heating-cooling", ["heater", "fan", "air conditioner", "dehumidifier", "히터", "선풍기", "에어컨"]],
  ]),
  category("Furniture & Home Decor", "furniture-home-decor", ["sofa", "bed", "table", "chair", "furniture", "가구", "소파", "침대", "테이블"], [
    ["Sofas & Lounge Suites", "sofas-lounge-suites", ["sofa", "couch", "recliner", "소파", "리클라이너"]],
    ["Beds & Bed Frames", "beds-bed-frames", ["bed frame", "bunk bed", "침대", "침대 프레임"]],
    ["Mattresses", "mattresses", ["mattress", "queen mattress", "매트리스"]],
    ["Dining Tables & Chairs", "dining-tables-chairs", ["dining table", "dining chair", "식탁", "의자", "테이블"]],
    ["Desks & Office Furniture", "desks-office-furniture", ["desk", "office chair", "filing cabinet", "책상", "사무용 의자"]],
    ["Wardrobes & Drawers", "wardrobes-drawers", ["wardrobe", "dresser", "drawers", "옷장", "서랍장"]],
    ["Lighting", "lighting", ["lamp", "light", "ceiling light", "조명", "스탠드"]],
    ["Rugs, Curtains & Blinds", "rugs-curtains-blinds", ["rug", "carpet", "curtain", "blind", "러그", "커튼"]],
    ["Wall Art & Decorations", "wall-art-decorations", ["wall art", "poster", "mirror", "decor", "액자", "거울", "장식"]],
  ]),
  category("Home & Kitchen", "home-kitchen", ["cookware", "kitchen", "bedding", "towel", "주방", "생활용품"], [
    ["Cookware", "cookware", ["pot", "pan", "wok", "pressure cooker", "냄비", "프라이팬"]],
    ["Bakeware", "bakeware", ["baking tray", "cake tin", "bakeware", "베이킹", "오븐팬"]],
    ["Tableware & Cutlery", "tableware-cutlery", ["plate", "bowl", "cup", "cutlery", "접시", "그릇", "식기"]],
    ["Kitchen Utensils", "kitchen-utensils", ["kitchen knife", "cutting board", "ladle", "칼", "도마", "주방도구"]],
    ["Food Storage & Drinkware", "food-storage-drinkware", ["lunch box", "food container", "tumbler", "thermos", "밀폐용기", "텀블러"]],
    ["Bedding", "bedding", ["duvet", "bed sheet", "pillow", "blanket", "이불", "침구", "베개"]],
    ["Towels & Bathroom", "towels-bathroom", ["towel", "bath mat", "shower curtain", "수건", "욕실"]],
    ["Storage & Organisation", "storage-organisation", ["storage box", "basket", "organiser", "정리함", "수납"]],
  ]),
  category("Clothing & Fashion", "clothing-fashion", ["clothing", "dress", "shoes", "bag", "fashion", "의류", "옷", "신발"], [
    ["Women's Clothing", "womens-clothing", ["women dress", "skirt", "blouse", "women's", "여성", "원피스", "치마"]],
    ["Men's Clothing", "mens-clothing", ["men shirt", "suit", "jeans", "men's", "남성", "셔츠", "정장"]],
    ["Children's Clothing", "childrens-clothing", ["kids clothes", "school uniform", "아동복", "교복"]],
    ["Shoes", "shoes", ["shoes", "sneakers", "boots", "sandals", "신발", "운동화", "부츠"]],
    ["Bags & Handbags", "bags-handbags", ["handbag", "backpack", "crossbody", "bag", "가방", "백팩"]],
    ["Jewellery", "jewellery", ["ring", "necklace", "earrings", "bracelet", "반지", "목걸이", "귀걸이"]],
    ["Watches", "watches", ["watch", "wristwatch", "시계"]],
    ["Sportswear & Workwear", "sportswear-workwear", ["activewear", "workwear", "safety vest", "운동복", "작업복"]],
  ]),
  category("Baby & Kids", "baby-kids", ["baby", "stroller", "car seat", "kids", "유아", "아기", "카시트"], [
    ["Prams & Strollers", "prams-strollers", ["pram", "stroller", "buggy", "유모차"]],
    ["Car Seats & Capsules", "car-seats-capsules", ["car seat", "booster seat", "capsule", "카시트", "부스터"]],
    ["Cots & Bassinets", "cots-bassinets", ["cot", "bassinet", "baby bed", "아기침대", "요람"]],
    ["High Chairs & Feeding", "high-chairs-feeding", ["high chair", "baby bottle", "feeding", "유아 식탁의자", "젖병"]],
    ["Baby Clothing", "baby-clothing", ["onesie", "baby clothes", "bodysuit", "바디수트", "아기옷"]],
    ["Baby Safety & Monitors", "baby-safety-monitors", ["baby monitor", "safety gate", "baby safety", "베이비 모니터", "안전문"]],
    ["Educational Toys", "educational-toys", ["montessori", "learning toy", "educational toy", "몬테소리", "학습 교구"]],
    ["Kids' Bikes & Scooters", "kids-bikes-scooters", ["kids bike", "balance bike", "kids scooter", "어린이 자전거", "킥보드"]],
  ]),
  category("Books, Music & Media", "books-music-media", ["book", "vinyl", "dvd", "cd", "책", "음반"], [
    ["Fiction & Non-fiction Books", "fiction-nonfiction-books", ["novel", "fiction", "non-fiction", "book", "소설", "책"]],
    ["Children's Books & Textbooks", "childrens-books-textbooks", ["textbook", "children's book", "picture book", "교재", "그림책"]],
    ["Language, Art & Cookbooks", "specialty-books", ["language book", "cookbook", "art book", "어학책", "요리책", "미술책"]],
    ["Comics & Manga", "comics-manga", ["comic", "manga", "graphic novel", "만화책"]],
    ["Vinyl Records & CDs", "vinyl-records-cds", ["vinyl", "lp", "record", "music cd", "레코드", "lp", "cd"]],
    ["DVDs & Blu-rays", "dvds-blu-rays", ["dvd", "blu-ray", "bluray", "블루레이"]],
    ["Stationery & Journals", "stationery-journals", ["diary", "notebook", "planner", "문구", "다이어리", "노트"]],
  ]),
  category("Hobbies & Collectables", "hobbies-collectables", ["collectable", "antique", "craft", "figure", "취미", "수집"], [
    ["Antiques", "antiques", ["antique", "vintage furniture", "골동품", "앤틱"]],
    ["Coins, Banknotes & Stamps", "coins-banknotes-stamps", ["coin", "banknote", "stamp", "동전", "지폐", "우표"]],
    ["Trading Cards", "trading-cards", ["pokemon card", "trading card", "yugioh", "포켓몬 카드", "트레이딩 카드"]],
    ["Collectable Figures & Models", "collectable-figures-models", ["funko", "figure", "model kit", "gundam", "피규어", "건담", "프라모델"]],
    ["Art & Craft Supplies", "art-craft-supplies", ["paint", "canvas", "beads", "craft supplies", "물감", "캔버스", "공예"]],
    ["Sewing & Knitting", "sewing-knitting", ["sewing", "knitting", "yarn", "fabric", "재봉", "뜨개", "실"]],
    ["RC Models & Science Kits", "rc-models-science-kits", ["rc car", "remote control", "microscope", "telescope", "rc카", "현미경"]],
  ]),
  category("Games & Toys", "games-toys", ["game", "console", "lego", "toy", "게임", "장난감"], [
    ["Gaming Consoles", "gaming-consoles", ["playstation", "ps5", "xbox", "nintendo switch", "console", "플레이스테이션", "닌텐도"]],
    ["Video Games", "video-games", ["video game", "game disc", "switch game", "게임 타이틀"]],
    ["Console Accessories", "console-accessories", ["controller", "game headset", "charging dock", "컨트롤러", "게임 패드"]],
    ["Board Games & Puzzles", "board-games-puzzles", ["board game", "puzzle", "card game", "보드게임", "퍼즐"]],
    ["LEGO & Building Toys", "lego-building-toys", ["lego", "building blocks", "magnetic blocks", "레고", "블록"]],
    ["Dolls, Figures & Soft Toys", "dolls-figures-soft-toys", ["barbie", "doll", "teddy bear", "plush", "인형", "봉제"]],
    ["Toy Vehicles & Ride-ons", "toy-vehicles-ride-ons", ["toy car", "ride on", "electric toy car", "장난감 자동차", "붕붕카"]],
  ]),
  category("Sports & Leisure", "sports-leisure", ["sports", "bike", "camping", "golf", "fitness", "스포츠", "자전거", "캠핑"], [
    ["Fitness & Cardio Equipment", "fitness-cardio-equipment", ["dumbbell", "treadmill", "exercise bike", "home gym", "덤벨", "러닝머신"]],
    ["Bicycles & Accessories", "bicycles-accessories", ["bicycle", "road bike", "mountain bike", "bike helmet", "자전거", "헬멧"]],
    ["Camping & Hiking", "camping-hiking", ["tent", "sleeping bag", "camping", "hiking", "텐트", "침낭", "등산"]],
    ["Fishing", "fishing", ["fishing rod", "reel", "lure", "낚시", "낚싯대"]],
    ["Water Sports & Swimming", "water-sports-swimming", ["kayak", "paddleboard", "surfboard", "swimsuit", "카약", "서핑"]],
    ["Golf & Racquet Sports", "golf-racquet-sports", ["golf club", "tennis racket", "badminton", "골프", "테니스", "배드민턴"]],
    ["Team Sports", "team-sports", ["rugby", "football", "soccer", "cricket", "basketball", "럭비", "축구"]],
  ]),
  category("Musical Instruments", "musical-instruments", ["guitar", "piano", "drum", "microphone", "악기", "기타", "피아노"], [
    ["Guitars & Amplifiers", "guitars-amplifiers", ["guitar", "bass guitar", "guitar amp", "기타", "앰프"]],
    ["Pianos & Keyboards", "pianos-keyboards", ["piano", "keyboard", "synthesizer", "digital piano", "피아노", "키보드"]],
    ["Drums & Percussion", "drums-percussion", ["drums", "cymbal", "cajon", "드럼", "심벌"]],
    ["String, Brass & Woodwind", "orchestral-instruments", ["violin", "cello", "flute", "saxophone", "trumpet", "바이올린", "색소폰"]],
    ["DJ & PA Equipment", "dj-pa-equipment", ["dj controller", "turntable", "pa speaker", "mixer", "dj", "턴테이블"]],
    ["Microphones & Recording", "microphones-recording", ["microphone", "audio interface", "studio monitor", "마이크", "오디오 인터페이스"]],
  ]),
  category("Garden, Tools & DIY", "garden-tools-diy", ["tool", "drill", "garden", "plant", "diy", "공구", "정원", "식물"], [
    ["Power Tools", "power-tools", ["drill", "grinder", "power saw", "sander", "전동드릴", "전동톱"]],
    ["Hand Tools & Tool Storage", "hand-tools-storage", ["hammer", "screwdriver", "wrench", "toolbox", "망치", "드라이버", "공구함"]],
    ["Lawn & Garden Tools", "lawn-garden-tools", ["lawn mower", "trimmer", "chainsaw", "mower", "잔디깎이", "예초기"]],
    ["Plants & Planters", "plants-planters", ["plant", "seedling", "pot", "planter", "식물", "화분"]],
    ["BBQs & Outdoor Cooking", "bbqs-outdoor-cooking", ["bbq", "barbecue", "grill", "smoker", "바베큐", "그릴"]],
    ["Building Materials & DIY", "building-materials-diy", ["timber", "tile", "brick", "flooring", "diy", "목재", "타일", "벽돌"]],
  ]),
  category("Pet Supplies", "pet-supplies", ["pet", "dog", "cat", "aquarium", "반려동물", "강아지", "고양이"], [
    ["Dog Supplies", "dog-supplies", ["dog bed", "dog leash", "dog toy", "강아지", "개 용품"]],
    ["Cat Supplies", "cat-supplies", ["cat tree", "scratcher", "cat bed", "고양이", "캣타워", "스크래처"]],
    ["Food, Bowls & Feeders", "pet-food-feeders", ["pet food", "pet treats", "feeder", "pet bowl", "사료", "급식기"]],
    ["Crates, Carriers & Bedding", "pet-crates-bedding", ["pet crate", "pet carrier", "pet bed", "이동장", "반려동물 침대"]],
    ["Grooming & Training", "pet-grooming-training", ["pet brush", "clipper", "training pad", "반려동물 미용", "배변패드"]],
    ["Aquarium, Bird & Small Animal", "small-pet-supplies", ["aquarium", "fish tank", "bird cage", "rabbit cage", "어항", "새장"]],
  ]),
  category("Health & Beauty", "health-beauty", ["skincare", "makeup", "perfume", "health", "beauty", "화장품", "건강"], [
    ["Skincare", "skincare", ["skincare", "cleanser", "cream", "serum", "스킨케어", "크림", "세럼"]],
    ["Make-up", "make-up", ["makeup", "foundation", "lipstick", "cosmetics", "메이크업", "립스틱"]],
    ["Haircare & Styling Tools", "haircare-styling-tools", ["hair dryer", "straightener", "curling iron", "헤어드라이어", "고데기"]],
    ["Perfume & Fragrance", "perfume-fragrance", ["perfume", "cologne", "body mist", "향수", "바디미스트"]],
    ["Personal Care Devices", "personal-care-devices", ["electric toothbrush", "shaver", "massage gun", "전동칫솔", "면도기", "마사지건"]],
    ["Mobility & Daily Living Aids", "mobility-daily-living-aids", ["wheelchair", "walker", "crutches", "shower chair", "휠체어", "보행 보조기"]],
  ]),
];

export const marketplaceKeywordCount = new Set(
  marketplaceCategories.flatMap((category) => [
    ...category.keywords,
    ...category.subcategories.flatMap((subcategory) => subcategory.keywords),
  ]).map((keyword) => keyword.trim().toLocaleLowerCase()),
).size;

export const marketplaceKeywordSummary = {
  total: marketplaceKeywordCount,
  tradeMeImported: tradeMeMappedKeywordCount,
};

export function getSubcategories(mainCategory: string) {
  return marketplaceCategories.find((category) => category.value === mainCategory)?.subcategories ?? [];
}

const HANGUL = /[가-힣]/;

/** `key` tells a Korean word from an English one that spells the same, and is built once rather than on every title. */
type IndexedKeyword = { text: string; isKorean: boolean; key: string };

/** A keyword in the form it is compared in: lower case, and for Korean without spaces. */
const indexKeyword = (keyword: string): IndexedKeyword => {
  const lower = keyword.toLocaleLowerCase();
  const isKorean = HANGUL.test(lower);
  const text = isKorean ? lower.replace(/\s+/g, "") : lower;
  return { text, isKorean, key: `${isKorean ? "ko" : "en"}:${text}` };
};

type KeywordIndex = {
  categories: Array<{ value: string; keywords: IndexedKeyword[]; subcategories: Array<{ value: string; keywords: IndexedKeyword[] }> }>;
  /** The categories that list each word, so a word can be told which categories a longer word speaks for. */
  owners: Map<string, Set<string>>;
};
let keywordIndex: KeywordIndex | null = null;

/** The dictionary runs to thousands of words and is asked about on every keystroke of a title, so it is normalised once. */
const getKeywordIndex = (): KeywordIndex => {
  if (keywordIndex) return keywordIndex;
  const owners = new Map<string, Set<string>>();
  const register = (keywords: IndexedKeyword[], categoryValue: string) => {
    for (const keyword of keywords) {
      if (!owners.has(keyword.key)) owners.set(keyword.key, new Set());
      owners.get(keyword.key)?.add(categoryValue);
    }
  };
  const categories = marketplaceCategories.map((category) => {
    const keywords = category.keywords.map(indexKeyword);
    register(keywords, category.value);
    return {
      value: category.value,
      keywords,
      subcategories: category.subcategories.map((subcategory) => {
        const subcategoryKeywords = subcategory.keywords.map(indexKeyword);
        register(subcategoryKeywords, category.value);
        return { value: subcategory.value, keywords: subcategoryKeywords };
      }),
    };
  });
  return keywordIndex = { categories, owners };
};

/**
 * Which category a title or a saved keyword belongs to, and which subcategory of it.
 *
 * Every dictionary word found in the title is a vote, a word in a subcategory counting for
 * more than one in its category, and the category with the most votes wins. One rule keeps
 * that honest: a word that sits inside a longer word found in the same place speaks only for
 * the categories that longer word belongs to. A title that says 아기침대 also contains 침대,
 * and "chromebook" also contains "book", but the longer word is what the title is about, so
 * 침대 may still back the baby category and may not pull the title towards furniture. Without
 * this a short common word won simply by being listed in more places.
 *
 * Words in different parts of a title still vote together and in full, so "baby cot with
 * mattress" is about the cot and not the mattress. When the votes are level the longer word
 * found decides, and then the order of the list.
 *
 * Korean is compared without spaces, because it is not spaced consistently: 에어 프라이어
 * and 에어프라이어 are one word.
 */
export function suggestCategoryFromTitle(title: string) {
  const normalized = title.trim().toLocaleLowerCase();
  if (normalized.length < 2) return null;
  const compact = normalized.replace(/\s+/g, "");
  const subjectOf = ({ isKorean }: IndexedKeyword) => (isKorean ? compact : normalized);
  const { categories, owners } = getKeywordIndex();

  // Where each character of the spaceless text sits in the original, so Korean and English
  // words can be set against each other in one coordinate system.
  const originalIndexOf: number[] = [];
  for (let at = 0; at < normalized.length; at += 1) if (normalized.charAt(at).trim()) originalIndexOf.push(at);

  // Every distinct word of the dictionary that the title contains. Two-character searches
  // such as "TV" and "소파" are valid saved keywords, so those must match exactly: a short
  // fragment cannot classify an unrelated title.
  const found = new Map<string, IndexedKeyword>();
  const consider = (keyword: IndexedKeyword) => {
    const subject = subjectOf(keyword);
    if (subject.length === 2 ? subject === keyword.text : subject.includes(keyword.text)) found.set(keyword.key, keyword);
  };
  for (const category of categories) {
    category.keywords.forEach(consider);
    for (const subcategory of category.subcategories) subcategory.keywords.forEach(consider);
  }
  if (!found.size) return null;

  /** The stretches of the original title a word occupies. */
  const rangesOf = (keyword: IndexedKeyword) => {
    const subject = subjectOf(keyword);
    const ranges: Array<[number, number]> = [];
    for (let at = subject.indexOf(keyword.text); at !== -1; at = subject.indexOf(keyword.text, at + 1)) {
      const end = at + keyword.text.length;
      ranges.push(keyword.isKorean ? [originalIndexOf[at], originalIndexOf[end - 1] + 1] : [at, end]);
    }
    return ranges;
  };

  // Longest words first, each claiming the text it matched for its own categories. A word
  // whose every occurrence is already inside the stretch of a clearly longer word is part of
  // that word: it may only speak for the categories of the words that cover it.
  //
  // "Clearly longer" because a plural or an ending is the same word, not a bigger one: "toys"
  // does not swallow "toy". Three more letters is where a longer word starts to mean something
  // else (bookshelf and book). A Korean syllable carries about as much as three letters, so
  // lengths are compared in that unit: 아기침대 swallows 침대, and "tv장" swallows "tv".
  const weightOf = ({ isKorean }: IndexedKeyword) => (isKorean ? 3 : 1);
  const sizeOf = (keyword: IndexedKeyword) => keyword.text.length * weightOf(keyword);
  const claimedBy: Array<Set<string> | null> = new Array(normalized.length).fill(null);
  const claimedSize: number[] = new Array(normalized.length).fill(0);
  const live = new Map<string, number>();
  const covered = new Map<string, Set<string>>();
  for (const [key, keyword] of [...found].sort((a, b) => sizeOf(b[1]) - sizeOf(a[1]))) {
    const ranges = rangesOf(keyword);
    const needed = sizeOf(keyword) + 3;
    const isInsideLongerWord = ranges.every(([from, to]) => claimedSize.slice(from, to).every((size) => size >= needed));
    if (!isInsideLongerWord) {
      live.set(key, sizeOf(keyword));
      for (const [from, to] of ranges) {
        for (let at = from; at < to; at += 1) {
          claimedBy[at] = new Set([...(claimedBy[at] ?? []), ...(owners.get(key) ?? [])]);
          claimedSize[at] = Math.max(claimedSize[at], sizeOf(keyword));
        }
      }
    } else {
      const speaksFor = new Set<string>();
      for (const [from, to] of ranges) for (let at = from; at < to; at += 1) claimedBy[at]?.forEach((categoryValue) => speaksFor.add(categoryValue));
      covered.set(key, speaksFor);
    }
  }

  const tally = (keywords: IndexedKeyword[], weight: number, categoryValue: string) => keywords.reduce(
    (result, keyword) => {
      const length = live.get(keyword.key);
      if (length) return { score: result.score + weight, longest: Math.max(result.longest, length) };
      return covered.get(keyword.key)?.has(categoryValue) ? { ...result, score: result.score + weight } : result;
    },
    { score: 0, longest: 0 },
  );

  let bestMatch: { mainCategory: string; subCategory: string; score: number; longest: number } | null = null;

  for (const category of categories) {
    const fromCategory = tally(category.keywords, 2, category.value);
    for (const subcategory of category.subcategories) {
      const fromSubcategory = tally(subcategory.keywords, 4, category.value);
      const score = fromCategory.score + fromSubcategory.score;
      const longest = Math.max(fromCategory.longest, fromSubcategory.longest);
      const beatsBest = !bestMatch || score > bestMatch.score || (score === bestMatch.score && longest > bestMatch.longest);
      if (score > 0 && beatsBest) bestMatch = { mainCategory: category.value, subCategory: subcategory.value, score, longest };
    }
  }

  return bestMatch ? { mainCategory: bestMatch.mainCategory, subCategory: bestMatch.subCategory, score: bestMatch.score } : null;
}
