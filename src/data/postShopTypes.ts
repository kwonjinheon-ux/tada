// The shop types a seller can post into. Plain data, deliberately not inside
// the client component that renders it: a "use client" module exports a client
// reference to a server component, not the value, so a route that needs to read
// this list would receive something it cannot iterate.

export type ShopTypeValue = "secondhand" | "garage-sale" | "moving-sale" | "2dollarshop" | "groupbuy";

export const postShopTypeOptions: Array<{ value: ShopTypeValue; label: string; icon: string }> = [
  { value: "secondhand", label: "Second Hands", icon: "ms-storefront" },
  { value: "garage-sale", label: "Garage Sale", icon: "ms-warehouse" },
  { value: "moving-sale", label: "Moving Sale", icon: "ms-local-shipping" },
  { value: "2dollarshop", label: "2 Dollar Shop", icon: "ms-savings" },
  { value: "groupbuy", label: "Group Buy", icon: "ms-groups" },
];

export function isShopTypeValue(value: unknown): value is ShopTypeValue {
  return typeof value === "string" && postShopTypeOptions.some((option) => option.value === value);
}
