# Media Contract

## Listing images

- Accept JPEG, PNG and WebP input up to 5 MB and ten images per listing.
- The client normalizes accepted listing images to WebP, strips metadata through canvas re-encoding and limits the longest edge to 2,000 px before upload.
- The private `market-listing-images` bucket stores the normalized source. The database stores only the storage path and display metadata.
- Delivery uses signed URLs with these variants: `thumbnail` (720×720 cover), `gallery` (1,600 px contain) and `avatar` (256×256 cover).

## Client rules

- Never use a public URL for a private bucket. Server routes/pages request signed URLs through `storage-image.ts`.
- Web and native clients share the input policy; native implementations must emit the same WebP/edge limits before upload.
- The next media step adds server-side malware/moderation checks and asynchronous derivative generation if image volume requires it.
