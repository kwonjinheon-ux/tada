import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
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
  createdAt: z.string().datetime(),
  readAt: z.string().datetime().nullable(),
});

export const marketFeedQuerySchema = z.object({
  q: z.string().trim().max(60).default(""),
  category: z.string().trim().max(80).optional(),
  subcategory: z.string().trim().max(80).optional(),
  sort: z.enum(["newest", "priceAsc", "priceDesc"]).default("newest"),
  cursor: z.string().min(1).max(500).optional(),
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
});

export const marketFeedResponseSchema = z.object({
  listings: z.array(marketFeedListingSchema),
  savedListingIds: z.array(uuidSchema),
  nextCursor: z.string().nullable(),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiFailure = z.infer<typeof apiFailureSchema>;
export type MarketMessageResponse = z.infer<typeof marketMessageResponseSchema>;
