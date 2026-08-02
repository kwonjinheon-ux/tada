import { NextResponse } from "next/server";
import { getTradeMeMappedLeafCategories } from "@/lib/trademe-public-taxonomy";

export const revalidate = 86_400;

/** Exposes only public category labels, never listing, seller, image, or price data. */
export async function GET() {
  try {
    const categories = await getTradeMeMappedLeafCategories();
    const keywordCount = new Set(categories.map((category) => category.name.trim().toLocaleLowerCase())).size;

    const fallbackSubcategoryCount = categories.filter((category) => category.tadaSubcategory.startsWith("other-")).length;

    return NextResponse.json(
      {
        categories: categories.map(({ name, tadaCategory, tadaSubcategory }) => ({ keyword: name, tadaCategory, tadaSubcategory })),
        totals: {
          mappedLeafCategories: categories.length,
          classifiedToSubcategory: categories.length,
          fallbackSubcategories: fallbackSubcategoryCount,
          uniqueKeywords: keywordCount,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    return NextResponse.json({ error: "The public category catalogue is temporarily unavailable." }, { status: 503 });
  }
}
