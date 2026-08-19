// Shared by the seller profile route (server) and the review list (client).
// A server component cannot read plain values out of a "use client" module —
// it only receives client references — so this contract lives on its own.

export const sellerReviewSorts = ["newest", "highest", "lowest"] as const;
export type SellerReviewSort = (typeof sellerReviewSorts)[number];

export const SELLER_REVIEWS_PER_PAGE = 20;

export type SellerReview = {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
  reviewer: { name: string; avatarUrl: string | null };
};
