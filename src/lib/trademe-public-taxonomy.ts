import "server-only";

import {
  resolveTadaCategoryFromTradeMePath,
  resolveTadaSubcategoryFromTradeMePath,
  tradeMeCategoryMappings,
} from "@/data/trademe-category-mapping";

type TradeMeCategoryNode = {
  Name: string;
  Number: string;
  Path: string;
  IsLeaf: boolean;
  Subcategories?: TradeMeCategoryNode[];
};

type TradeMeCategoryResponse = TradeMeCategoryNode;

export type TradeMeMappedLeafCategory = {
  name: string;
  number: string;
  path: string;
  tadaCategory: string;
  tadaSubcategory: string;
};

const tradeMeCategoriesUrl = "https://api.trademe.co.nz/v1/Categories.json";

function flattenSupportedLeaves(node: TradeMeCategoryNode): TradeMeMappedLeafCategory[] {
  if (node.IsLeaf) {
    const tadaCategory = resolveTadaCategoryFromTradeMePath(node.Path);
    const tadaSubcategory = resolveTadaSubcategoryFromTradeMePath(node.Path, tadaCategory);
    return tadaCategory && tadaSubcategory
      ? [{ name: node.Name, number: node.Number, path: node.Path, tadaCategory, tadaSubcategory }]
      : [];
  }

  return (node.Subcategories ?? []).flatMap(flattenSupportedLeaves);
}

/**
 * Retrieves Trade Me's public category tree (not listing data) once per day.
 * Only roots mapped to an existing Tada product category are returned.
 */
export async function getTradeMeMappedLeafCategories() {
  const response = await fetch(tradeMeCategoriesUrl, { next: { revalidate: 86_400 } });
  if (!response.ok) throw new Error(`Trade Me category catalogue request failed with ${response.status}`);

  const catalogue = (await response.json()) as TradeMeCategoryResponse;
  const supportedRoots = new Set(tradeMeCategoryMappings.map((mapping) => mapping.sourceCategoryNumber));

  return (catalogue.Subcategories ?? [])
    .filter((category) => supportedRoots.has(category.Number))
    .flatMap(flattenSupportedLeaves);
}
