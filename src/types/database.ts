export type ListingStatus = "draft" | "available" | "pending" | "sold" | "archived";
export type Listing = { id: string; ownerId: string; title: string; description: string; priceCents: number; status: ListingStatus; createdAt: string; };

export type ContentPostStatus = "draft" | "published" | "archived";
export type ContentPost = {
  id: string;
  authorId: string;
  serviceKey: string;
  postType: string;
  status: ContentPostStatus;
  title: string;
  body: string;
  regionCity: string | null;
  regionSuburb: string | null;
  contactMethod: "in_app" | "email" | "phone";
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
