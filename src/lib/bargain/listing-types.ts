export const bargainListingTypes = [
  { value: "2-dollar-deals", label: "$2 Deals", icon: "ti-coins", maximumPriceCents: 200 },
  { value: "5-dollar-deals", label: "$5 Deals", icon: "ti-tags", maximumPriceCents: 500 },
  { value: "10-dollar-deals", label: "$10 Deals", icon: "ti-ticket", maximumPriceCents: 1_000 },
  { value: "moving-sale", label: "Moving Sale", icon: "ti-truck-loading", maximumPriceCents: null },
  { value: "garage-sale", label: "Garage Sale", icon: "ti-building-warehouse", maximumPriceCents: null },
] as const;

export type BargainListingType = (typeof bargainListingTypes)[number]["value"];

export function isMultiItemBargain(type: BargainListingType) {
  return type === "moving-sale" || type === "garage-sale";
}

export function getBargainTypeMaximumPrice(type: BargainListingType) {
  return bargainListingTypes.find((option) => option.value === type)?.maximumPriceCents ?? null;
}
