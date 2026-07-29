# Shared API Contract

## Contract shape

All new app-facing endpoints return one of two JSON envelopes. This applies to web and future native clients; existing unversioned endpoints are migrated incrementally.

```ts
type ApiSuccess<T> = { data: T; meta?: { requestId?: string; nextCursor?: string | null } };
type ApiFailure = { error: { code: ApiErrorCode; message: string; details?: Record<string, unknown> } };
```

`src/contracts/api.ts` is the source of truth for Zod request/response schemas. Client code must parse responses with `readApiResponse`, and routes must use `apiSuccess` or `apiFailure`.

## Rules

- JSON fields use `camelCase`; database column names never become the public API contract.
- UUIDs, inputs and response payloads are validated with Zod at the route boundary.
- Errors use only these stable codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNAVAILABLE`, `INTERNAL`.
- The HTTP status remains meaningful; clients use the code for product behaviour and the message for presentation.
- List endpoints use `meta.nextCursor`; offset pagination is not added to new endpoints.
- Sensitive Supabase details, SQL errors and RLS policy names never appear in API responses.

## Initial migrated endpoints

| Endpoint | Contract |
| --- | --- |
| `GET/POST/DELETE /api/market/wishlist` | `marketWishlistRequestSchema`, `marketWishlistResponseSchema` |
| `POST /api/market/conversations` | `marketConversationRequestSchema`, `marketConversationResponseSchema` |
| `POST /api/market/messages` | `marketMessageRequestSchema`, `marketMessageResponseSchema` |

The next API work migrates listings, comments, offers, notifications and keyword alerts before exposing versioned native-app routes.
