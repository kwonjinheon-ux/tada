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
  sort: z.enum(["newest", "priceAsc", "priceDesc"]).default("newest"),
  cursor: z.string().min(1).max(500).optional(),
});

export const bargainTypeSchema = z.enum(["all", "2-dollar-deals", "5-dollar-deals", "10-dollar-deals", "moving-sale", "garage-sale", "newly-listed", "nearby-deals"]);
export const bargainFeedQuerySchema = marketFeedQuerySchema.pick({ q: true, sort: true, mainLocation: true, subLocation: true, category: true, subcategory: true, maxPrice: true, condition: true, cursor: true }).extend({ bargain: bargainTypeSchema.default("all") });

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
  // commentCount: z.number().int().nonnegative().optional(), // parked for reuse on a different category later
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
  "free-stuff",
  "lost-found",
  "parents-kids",
  "jobs-services",
  "housing-flatmates",
  "study-language",
  "clubs-meetups",
]);

export const communityPostCreateRequestSchema = z.object({
  categorySlug: communityPostCategorySchema,
  title: z.string().trim().min(4).max(120),
  body: z.string().trim().min(20).max(5_000),
  mainLocation: z.string().trim().min(2).max(80),
  subLocation: z.string().trim().max(80).optional(),
  imagePaths: z.array(z.string().regex(/^[0-9a-f-]{36}\/attachments\/[0-9a-f-]{36}\.webp$/i)).max(10).default([]),
});

export const communityPostCreateResponseSchema = z.object({ id: uuidSchema });

export const communityPostFeedItemSchema = z.object({
  id: uuidSchema,
  type: z.enum(["event", "question", "recommendation", "free", "notice", "housing"]),
  title: z.string(),
  excerpt: z.string(),
  location: z.string(),
  timeAgo: z.string(),
  images: z.array(z.object({ src: z.string().url(), alt: z.string() })).optional(),
});

export const communityPostFeedResponseSchema = z.object({ posts: z.array(communityPostFeedItemSchema) });

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiFailure = z.infer<typeof apiFailureSchema>;
export type MarketMessageResponse = z.infer<typeof marketMessageResponseSchema>;
