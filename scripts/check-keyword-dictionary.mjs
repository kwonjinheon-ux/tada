// Checks the category keyword dictionary, in English and Korean.
//
//   npm run check:keywords
//
// Two kinds of check. The first is about the shape of the Korean additions in
// src/data/marketplace-keywords-ko.ts: every slug must name a real category or
// subcategory (a renamed one would otherwise lose its words without a sound), no word
// may be a single syllable (it sits inside too many other words), and a word may not be
// listed under two different main categories (the matcher cannot tell which was meant).
//
// The second is a set of searches that must keep landing where they do. Each is here
// because it was once wrong, or because it is the kind of search the dictionary exists
// for, and a change to the words or to the matcher should not move any of them.
//
// The data modules are TypeScript, so they are run through the compiler the project
// already has rather than through a second tool.

import { createRequire } from "node:module";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");
const Module = require("node:module");

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith("@/")) request = join(root, "src", request.slice(2));
  for (const candidate of [request, `${request}.ts`, join(request, "index.ts")]) {
    try { if (statSync(candidate).isFile()) return candidate; } catch { /* try the next spelling */ }
  }
  return resolveFilename.call(this, request, ...rest);
};
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename });
  module._compile(outputText, filename);
};

const { marketplaceCategories, suggestCategoryFromTitle } = require(join(root, "src/data/marketplace-categories.ts"));
const { categoryKeywordAdditions, subcategoryKeywordAdditions } = require(join(root, "src/data/marketplace-keywords-ko.ts"));

const hasHangul = (text) => /[가-힣]/.test(text);
const compact = (text) => text.replace(/\s+/g, "").toLowerCase();
const problems = [];

// ---- shape of the additions -------------------------------------------------
const categoryOfSubcategory = new Map();
for (const category of marketplaceCategories) for (const subcategory of category.subcategories) categoryOfSubcategory.set(subcategory.value, category.value);

const mainCategoriesOf = new Map();
const note = (word, mainCategory) => {
  const key = compact(word);
  if (!mainCategoriesOf.has(key)) mainCategoriesOf.set(key, new Set());
  mainCategoriesOf.get(key).add(mainCategory);
};
const readGroup = (slug, additions, mainCategory) => {
  for (const word of [...additions.ko, ...(additions.en ?? [])]) {
    if (hasHangul(word) && compact(word).length < 2) problems.push(`"${word}" in ${slug} is a single syllable`);
    note(word, mainCategory);
  }
};
for (const [slug, additions] of Object.entries(categoryKeywordAdditions)) {
  if (!marketplaceCategories.some((category) => category.value === slug)) problems.push(`category additions name an unknown category: ${slug}`);
  else readGroup(slug, additions, slug);
}
for (const [slug, additions] of Object.entries(subcategoryKeywordAdditions)) {
  const mainCategory = categoryOfSubcategory.get(slug);
  if (!mainCategory) problems.push(`subcategory additions name an unknown subcategory: ${slug}`);
  else readGroup(slug, additions, mainCategory);
}
for (const [word, categories] of mainCategoriesOf) if (categories.size > 1) problems.push(`"${word}" is listed under more than one main category: ${[...categories].join(", ")}`);

// The same rule across the whole Korean dictionary, the older hand-written words included.
// These two really do mean two things and are left to the order of the list; a third one
// should be a decision, not an accident.
const MEANS_TWO_THINGS = new Set(["키보드", "앰프"]);
const everyKoreanWord = new Map();
for (const category of marketplaceCategories) {
  for (const list of [category.keywords, ...category.subcategories.map((subcategory) => subcategory.keywords)]) {
    for (const word of list.filter(hasHangul)) {
      const key = compact(word);
      if (!everyKoreanWord.has(key)) everyKoreanWord.set(key, new Set());
      everyKoreanWord.get(key).add(category.value);
    }
  }
}
for (const [word, categories] of everyKoreanWord) {
  if (categories.size > 1 && !MEANS_TWO_THINGS.has(word)) problems.push(`"${word}" is in the dictionary under more than one main category: ${[...categories].join(", ")}`);
}

// ---- searches that must keep landing where they do -------------------------
const MUST_LAND = [
  // Korean words that found nothing before the dictionary was extended
  ["청소기", "electronics-appliances"], ["패딩", "clothing-fashion"], ["가습기", "electronics-appliances"], ["공기청정기", "electronics-appliances"], ["선글라스", "clothing-fashion"],
  ["요가매트", "sports-leisure"], ["스노보드", "sports-leisure"], ["우쿨렐레", "musical-instruments"], ["사다리", "garden-tools-diy"], ["교과서", "books-music-media"],
  ["엑스박스", "games-toys"], ["전기장판", "electronics-appliances"], ["하이체어", "baby-kids"], ["전집", "books-music-media"], ["화장대", "furniture-home-decor"],
  // a short word inside a longer one belongs to the longer one
  ["아기침대", "baby-kids"], ["아기 침대", "baby-kids"], ["어린이 자전거", "baby-kids"], ["책장", "furniture-home-decor"], ["신발장", "furniture-home-decor"],
  ["TV장", "furniture-home-decor"], ["드럼세탁기", "electronics-appliances"], ["카시트", "baby-kids"], ["반려동물 침대", "pet-supplies"], ["스키니진", "clothing-fashion"],
  ["chromebook", "computers-laptops"], ["dog food 20kg bag", "pet-supplies"], ["bookshelf", "furniture-home-decor"], ["dog bed", "pet-supplies"],
  // words in different parts of a title still vote together
  ["Baby cot with mattress", "baby-kids"], ["Playstation 5 console with 2 controllers", "games-toys"], ["샤오미 전동 킥보드", "sports-leisure"], ["공기청정기 샤오미", "electronics-appliances"],
  // a plural is the same word, not a bigger one
  ["baby toys", "baby-kids"],
  // spacing is not consistent in Korean
  ["에어프라이어", "electronics-appliances"], ["에어 프라이어", "electronics-appliances"], ["블루투스스피커", "electronics-appliances"], ["블루투스 스피커", "electronics-appliances"],
  // English that was wrong before
  ["bicycle", "sports-leisure"], ["jigsaw puzzle", "games-toys"], ["baby walker", "baby-kids"], ["vacuum cleaner", "electronics-appliances"], ["puffer jacket", "clothing-fashion"],
];
for (const [search, expected] of MUST_LAND) {
  const got = suggestCategoryFromTitle(search)?.mainCategory ?? null;
  if (got !== expected) problems.push(`"${search}" lands in ${got ?? "nothing"}, expected ${expected}`);
}

if (problems.length) {
  console.error(`Keyword dictionary: ${problems.length} problem${problems.length === 1 ? "" : "s"}\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
  process.exit(1);
}
const words = marketplaceCategories.reduce((total, category) => total + category.keywords.length + category.subcategories.reduce((sum, subcategory) => sum + subcategory.keywords.length, 0), 0);
console.log(`Keyword dictionary is sound: ${words} words, ${MUST_LAND.length} searches land where they should.`);
