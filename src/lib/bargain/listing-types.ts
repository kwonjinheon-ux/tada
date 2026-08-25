export const bargainListingTypes = [
  { value: "2-dollar-deals", label: "$2 Deals", icon: "ms-savings", maximumPriceCents: 200 },
  { value: "5-dollar-deals", label: "$5 Deals", icon: "ms-sell", maximumPriceCents: 500 },
  { value: "10-dollar-deals", label: "$10 Deals", icon: "ms-local-activity", maximumPriceCents: 1_000 },
  { value: "moving-sale", label: "Moving Sale", icon: "ms-moving", maximumPriceCents: null },
  { value: "garage-sale", label: "Garage Sale", icon: "ms-warehouse", maximumPriceCents: null },
] as const;

export type BargainListingType = (typeof bargainListingTypes)[number]["value"];

export function isMultiItemBargain(type: BargainListingType) {
  return type === "moving-sale" || type === "garage-sale";
}

export function getBargainTypeMaximumPrice(type: BargainListingType) {
  return bargainListingTypes.find((option) => option.value === type)?.maximumPriceCents ?? null;
}
