import { containsProhibitedPublicContent } from "@/lib/safety/prohibited-content";

export const prohibitedMarketplaceItems = [
  "Firearms and weapons",
  "Prescription medicine",
  "Tobacco and vapes",
  "Alcohol",
  "Recreational drugs",
  "Financial products",
  "Gambling",
  "Adult sexual services",
  "Counterfeit goods",
  "Recalled or unsafe products",
  "Stolen goods",
] as const;

const prohibitedCategorySlugs = new Set([
  "firearms-weapons", "weapons", "prescription-medicine", "tobacco-vapes", "alcohol", "recreational-drugs",
  "financial-products", "gambling", "adult-sexual-services", "counterfeit-goods", "recalled-unsafe-products", "stolen-goods",
]);

export function containsProhibitedMarketplaceContent(...values: Array<string | null | undefined>) {
  return containsProhibitedPublicContent(...values);
}

export function isProhibitedMarketplaceCategory(...values: Array<string | null | undefined>) {
  return values.some((value) => value ? prohibitedCategorySlugs.has(value.trim().toLowerCase()) || containsProhibitedMarketplaceContent(value) : false);
}

export function violatesMarketplaceProhibitedItemsPolicy(...values: Array<string | null | undefined>) {
  return isProhibitedMarketplaceCategory(...values) || containsProhibitedMarketplaceContent(...values);
}

export const prohibitedMarketplaceItemsMessage = "This item cannot be listed on Tada because it is a prohibited item.";
