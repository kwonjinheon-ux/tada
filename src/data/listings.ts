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
  // Null when the feed serialises "no badge"; undefined when the source never
  // sets one. Both mean the same thing to a card.
  badge?: "Promotion" | "Newly Listed" | null;
  status: ListingStatus;
  isOwner?: boolean;
  commentCount?: number;
  // Populated by feed queries only, used to interleave-sort results pulled from
  // more than one source (see getMergedMarketFeed) — not part of the API contract.
  sortValue?: string | number;
};

export const listings: Listing[] = [];

export const quickCategories = ["All", "Smartphones", "Computers", "Laptops", "Tablets", "Audio", "Cameras"];
