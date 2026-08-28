import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "UNAVAILABLE",
  "INTERNAL",
]);

export const apiFailureSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const apiSuccessSchema = <T extends z.ZodTypeAny>(data: T) => z.object({
  data,
  meta: z.object({ requestId: z.string().optional(), nextCursor: z.string().nullable().optional() }).optional(),
});

export const uuidSchema = z.string().uuid();

export const marketWishlistRequestSchema = z.object({ listingId: uuidSchema });
export const marketWishlistResponseSchema = z.object({ saved: z.boolean() });
export const communityWishlistRequestSchema = z.object({ postId: uuidSchema });
export const communityWishlistResponseSchema = z.object({ saved: z.boolean() });
export const serviceWishlistRequestSchema = z.object({ serviceId: uuidSchema });
export const serviceWishlistResponseSchema = z.object({ saved: z.boolean() });
export const groupBuyCreateRequestSchema = z.object({
  title: z.string().trim().min(4).max(100),
  summary: z.string().trim().min(4).max(140),
  description: z.string().trim().min(20).max(5_000),
  referencePrefix: z.string().regex(/^[A-Z]{2,4}$/),
  closesAt: z.string().datetime({ offset: true }),
  handoverAt: z.string().datetime({ offset: true }),
  pickup: z.object({ available: z.boolean(), address: z.string().trim().max(200), window: z.string().trim().max(120), note: z.string().trim().max(500) }),
  delivery: z.object({ available: z.boolean(), feeCents: z.number().int().min(0).max(100_000_000), freeOverCents: z.number().int().min(0).max(100_000_000).nullable(), areas: z.array(z.string().trim().min(1).max(80)).max(30) }),
  bank: z.object({ accountName: z.string().trim().min(2).max(120), accountNumber: z.string().trim().min(5).max(80) }),
  minimumOrderCents: z.number().int().min(0).max(100_000_000).nullable(),
  items: z.array(z.object({ name: z.string().trim().min(1).max(100), note: z.string().trim().max(280), priceCents: z.number().int().min(1).max(100_000_000), unitLabel: z.string().trim().min(1).max(40), limitPerPerson: z.number().int().min(1).max(1_000).nullable(), photoPath: z.string().regex(/^[0-9a-f-]{36}\/group-buy\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i).nullable(), photoAlt: z.string().trim().max(200) })).min(1).max(50),
}).refine((data) => data.pickup.available || data.delivery.available, "Choose pickup or delivery.").refine((data) => !data.pickup.available || (data.pickup.address.length > 0 && data.pickup.window.length > 0), "Pickup address and time are required.").refine((data) => new Date(data.handoverAt) > new Date(data.closesAt), "Handover must be after closing.");
export const groupBuyCreateResponseSchema = z.object({ id: uuidSchema });
export const groupBuyOrderRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(3).max(50),
  fulfilment: z.enum(["pickup", "delivery"]),
  address: z.string().trim().max(300).optional(),
  note: z.string().trim().max(1_000).optional(),
  lines: z.array(z.object({ itemId: uuidSchema, quantity: z.number().int().min(1).max(1_000) })).min(1).max(50),
}).superRefine((data, context) => {
  if (data.fulfilment === "delivery" && !data.address) context.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Delivery address is required." });
});

export const marketSearchTermRequestSchema = z.object({ term: z.string().trim().min(2).max(80) });
export const marketSearchTermsResponseSchema = z.object({ terms: z.array(z.string().min(2).max(80)).max(3) });

export const marketConversationRequestSchema = z.object({ listingId: uuidSchema });
export const marketConversationResponseSchema = z.object({ conversationId: uuidSchema, created: z.boolean() });

export const marketMessageRequestSchema = z.object({
  conversationId: uuidSchema,
  body: z.string().trim().min(1).max(2_000),
});

export const marketMessageResponseSchema = z.object({
  id: uuidSchema,
  conversationId: uuidSchema,
  senderId: uuidSchema,
  recipientId: uuidSchema,
  body: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  readAt: z.string().datetime({ offset: true }).nullable(),
});

// Bulk inbox housekeeping. `scope` lets the caller act on everything it can
// currently see without shipping hundreds of ids; `conversationIds` covers the
// selected-rows case. Exactly one of the two is required.
export const marketConversationScopeSchema = z.enum(["inbox", "archived"]);

export const marketConversationBulkRequestSchema = z.union([
  z.object({ conversationIds: z.array(uuidSchema).min(1).max(500) }),
  z.object({ scope: marketConversationScopeSchema }),
]);

export const marketConversationArchiveRequestSchema = z.intersection(
  marketConversationBulkRequestSchema,
  z.object({ archived: z.boolean() }),
);

export const marketConversationBulkResponseSchema = z.object({
  conversationIds: z.array(uuidSchema),
});

export const marketReportRequestSchema = z.object({
  targetType: z.enum(["listing", "user", "comment", "message"]),
  targetId: uuidSchema,
  reason: z.enum(["fraud", "prohibited_item", "harassment", "spam", "inappropriate_content", "other"]),
  details: z.string().trim().max(1_000).optional(),
});

export const marketBlockRequestSchema = z.object({ blockedUserId: uuidSchema });
export const marketReportResponseSchema = z.object({ reportId: uuidSchema, status: z.literal("open") });
export const marketBlockResponseSchema = z.object({ blocked: z.boolean() });

export const marketModerationReviewRequestSchema = z.object({
  status: z.enum(["in_review", "resolved", "dismissed"]),
  reviewerNote: z.string().trim().max(1_000).optional(),
  action: z.enum(["none", "warning", "suspension", "listing_hidden", "listing_restored"]).default("none"),
  suspensionHours: z.number().int().min(1).max(24 * 365).optional(),
});

export const marketFeedQuerySchema = z.object({
  q: z.string().trim().max(60).default(""),
  category: z.string().trim().max(80).optional(),
  subcategory: z.string().trim().max(80).optional(),
  maxPrice: z.coerce.number().int().min(50).max(100_000).optional(),
  condition: z.enum(["brand_new", "like_new", "excellent", "good", "fair"]).optional(),
  mainLocation: z.string().trim().max(80).optional(),
  subLocation: z.string().trim().max(80).optional(),
  sort: z.enum(["newest", "priceAsc", "priceDesc", "hot"]).default("newest"),
  cursor: z.string().min(1).max(500).optional(),
});

export const bargainTypeSchema = z.enum(["all", "2-dollar-deals", "5-dollar-deals", "10-dollar-deals", "moving-sale", "garage-sale", "newly-listed", "nearby-deals"]);
export const bargainFeedQuerySchema = marketFeedQuerySchema.pick({ q: true, sort: true, mainLocation: true, subLocation: true, category: true, subcategory: true, maxPrice: true, condition: true, cursor: true }).extend({ bargain: bargainTypeSchema.default("all") });

export const bargainPickupReservationRequestSchema = z.object({
  listingId: uuidSchema,
  itemId: uuidSchema,
  pickupStartAt: z.string().datetime({ offset: true }),
  pickupEndAt: z.string().datetime({ offset: true }),
}).refine(({ pickupStartAt, pickupEndAt }) => new Date(pickupEndAt).getTime() - new Date(pickupStartAt).getTime() === 30 * 60 * 1000, "Choose a 30-minute pickup time.");

export const bargainPickupReservationActionSchema = z.object({
  action: z.enum(["accept", "decline", "cancel", "on_the_way", "picked_up", "no_show"]),
});

export const marketFeedListingSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  price: z.string(),
  location: z.string(),
  image: z.string().url(),
  imageAlt: z.string(),
  categorySlug: z.string().nullable(),
  subcategorySlug: z.string().nullable(),
  badge: z.enum(["Newly Listed", "Promotion"]).optional(),
  status: z.enum(["available", "pending", "sold"]),
  isOwner: z.boolean().optional(),
  commentCount: z.number().int().nonnegative().optional(),
});

export const marketFeedResponseSchema = z.object({
  listings: z.array(marketFeedListingSchema),
  savedListingIds: z.array(uuidSchema),
  nextCursor: z.string().nullable(),
});

export const communityPostCategorySchema = z.enum([
  "local-noticeboard",
  "events",
  "qna",
  "recommendations",
  "together",
  "immigration",
  "free-board",
]);

export const communityPostCreateRequestSchema = z.object({
  categorySlug: communityPostCategorySchema,
  title: z.string().trim().min(4).max(120),
  body: z.string().trim().min(20).max(5_000),
  mainLocation: z.string().trim().min(2).max(80),
  subLocation: z.string().trim().max(80).optional(),
  imagePaths: z.array(z.string().regex(/^[0-9a-f-]{36}\/attachments\/[0-9a-f-]{36}\.webp$/i)).max(10).default([]),
});

export const marketTradeReviewRequestSchema = z.object({
  offerId: uuidSchema,
  score: z.number().min(0.5).max(5).refine((value) => Number.isInteger(value * 2), "Choose a half-star rating."),
  comment: z.string().trim().min(1).max(1_000),
});

export const marketTradeReviewResponseSchema = z.object({
  reviewId: uuidSchema,
  offerId: uuidSchema,
  sellerId: uuidSchema,
  score: z.number().min(0.5).max(5),
  comment: z.string(),
  createdAt: z.string().datetime({ offset: true }),
});

export const communityPostCreateResponseSchema = z.object({ id: uuidSchema });

export const communityPostUpdateRequestSchema = z.object({
  title: z.string().trim().min(4).max(120),
  body: z.string().trim().min(20).max(5_000),
});

export const communityPostFeedItemSchema = z.object({
  id: uuidSchema,
  type: z.enum(["event", "question", "recommendation", "free", "notice", "housing"]),
  title: z.string(),
  excerpt: z.string(),
  location: z.string(),
  timeAgo: z.string(),
  thumbnail: z.string().url().optional(),
  images: z.array(z.object({ src: z.string().url(), alt: z.string() })).optional(),
  responseCount: z.number().int().nonnegative().optional(),
  score: z.number().int().optional(),
  myVote: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  shareCount: z.number().int().nonnegative().optional(),
  viewCount: z.number().int().nonnegative().optional(),
  authorName: z.string().optional(),
  authorAvatarUrl: z.string().url().nullable().optional(),
  isOwner: z.boolean().optional(),
  isSaved: z.boolean().optional(),
});

export const communityPostFeedResponseSchema = z.object({ posts: z.array(communityPostFeedItemSchema) });

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiFailure = z.infer<typeof apiFailureSchema>;
export type MarketMessageResponse = z.infer<typeof marketMessageResponseSchema>;
