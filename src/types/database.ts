export type ListingStatus = "draft" | "available" | "pending" | "sold" | "archived";
export type Listing = { id: string; ownerId: string; title: string; description: string; priceCents: number; status: ListingStatus; createdAt: string; };
