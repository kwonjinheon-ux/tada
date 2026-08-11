export type ListingStatus = "available" | "pending" | "sold";

export type Listing = {
  id: string;
  title: string;
  price: string;
  location: string;
  image: string;
  imageAlt: string;
  categorySlug?: string | null;
  subcategorySlug?: string | null;
  bargainType?: string | null;
  eventDateRange?: string | null;
  badge?: "Promotion" | "Newly Listed";
  status: ListingStatus;
  // Populated by feed queries only, used to interleave-sort results pulled from
  // more than one source (see getMergedMarketFeed) — not part of the API contract.
  sortValue?: string | number;
  // commentCount?: number; // parked for reuse on a different category later
};

export const listings: Listing[] = [];

export const quickCategories = ["All", "Smartphones", "Computers", "Laptops", "Tablets", "Audio", "Cameras"];
