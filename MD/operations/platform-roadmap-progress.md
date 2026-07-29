# Platform Roadmap Progress

Updated: 2026-07-29

## Completed work

### 1. Launch readiness

- Defined the limited public web-launch scope, excluded scope and the six primary user journeys.
- Added product, security, reliability and data-platform release gates.
- Defined measurable targets and a pass/risk-accepted/block release decision model.

Reference: `MD/product/launch-readiness.md`

### 2. Shared API contract

- Added Zod schemas for shared API errors, wishlist, conversations, messages and marketplace feed queries.
- Standardised migrated endpoints on `{ data }` success envelopes and `{ error: { code, message } }` failure envelopes.
- Added a typed client response parser.
- Migrated wishlist, conversation creation and message sending, together with their web clients.

Reference: `MD/architecture/api-contract.md`, `src/contracts/api.ts`, `src/lib/api/`

### 3. Server-side marketplace search and feed

- Replaced the fixed latest-48 client-side filter with server-side search, category/subcategory filtering and price/newest sorting.
- Added cursor-based incremental loading through `GET /api/market/listings`.
- Moved page and API feed reads into the shared server-only `src/lib/market/feed.ts` module.

Open follow-up: add and verify database indexes for text/location search and price sorting. Supabase CLI migration creation currently fails because it incorrectly treats the existing migrations directory as a new-directory target; do not hand-create a migration file as a workaround.

### 4. Media pipeline baseline

- Added a single marketplace image input policy: JPEG/PNG/WebP, maximum 5 MB, maximum ten images.
- Normalise listing uploads to WebP, remove source metadata through canvas re-encoding and limit the longest edge to 2,000 px.
- Documented signed delivery variants for thumbnail, gallery and avatar use.
- Fixed listing edit previews to use signed URLs from the private image bucket rather than public URLs.

Reference: `MD/architecture/media-contract.md`, `src/lib/media/market-listing-image.ts`

## Validation performed

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

All passed after the latest implementation work.

## Next priority

Before beginning the safety and operations work, restore the Supabase migration workflow and add the marketplace feed indexes. Then continue with reports, blocks, moderation cases and administrator review tools.
