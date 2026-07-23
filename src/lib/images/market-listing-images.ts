import "server-only";

import sharp from "sharp";

export const MARKET_LISTING_IMAGE_BUCKET = "market-listing-images";
export const MARKET_LISTING_IMAGE_CACHE_CONTROL = "31536000";
// Vercel Functions reject request bodies larger than 4.5 MB. Leave room for
// multipart form data so every accepted upload can reach the optimiser.
export const MAX_MARKET_LISTING_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_MARKET_LISTING_IMAGE_PIXELS = 40_000_000;

export type MarketImageFormat = "webp" | "avif";
export type MarketImageVariant = "thumbnail" | "listing" | "detail";

const variantLongestEdges: Record<MarketImageVariant, number> = {
  thumbnail: 400,
  listing: 800,
  detail: 2000,
};

const acceptedFormats = new Set(["jpeg", "png", "webp", "heif"]);

export type OptimisedMarketImage = {
  variant: MarketImageVariant;
  data: Buffer;
  width: number;
  height: number;
  contentType: "image/webp" | "image/avif";
};

export type OptimisedMarketImageSet = {
  format: MarketImageFormat;
  sourceWidth: number;
  sourceHeight: number;
  images: Record<MarketImageVariant, OptimisedMarketImage>;
};

export function getMarketListingImagePaths({ userId, listingId, photoId, format = "webp" }: {
  userId: string;
  listingId: string;
  photoId: string;
  format?: MarketImageFormat;
}) {
  const basePath = `users/${userId}/listings/${listingId}/${photoId}`;
  return {
    thumbnail: `${basePath}/thumb.${format}`,
    listing: `${basePath}/medium.${format}`,
    detail: `${basePath}/large.${format}`,
  } as const;
}

function outputContentType(format: MarketImageFormat) {
  return format === "avif" ? "image/avif" : "image/webp";
}

async function encodeVariant(input: Buffer, variant: MarketImageVariant, format: MarketImageFormat) {
  const longestEdge = variantLongestEdges[variant];
  const pipeline = sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_MARKET_LISTING_IMAGE_PIXELS,
    sequentialRead: true,
  })
    .autoOrient()
    .resize({ width: longestEdge, height: longestEdge, fit: "inside", withoutEnlargement: true, kernel: sharp.kernel.lanczos3 });

  const encode = (quality: number) => format === "avif"
    ? pipeline.clone().avif({ quality, effort: 4 }).toBuffer({ resolveWithObject: true })
    : pipeline.clone().webp({ quality, effort: 4, preset: "photo", smartSubsample: true }).toBuffer({ resolveWithObject: true });

  // Keep detail shots crisp by starting at 85. Only step down for unusually large outputs.
  let output = await encode(85);
  for (const quality of [80, 76]) {
    if (output.data.byteLength <= 3 * 1024 * 1024 || variant !== "detail") break;
    output = await encode(quality);
  }

  return {
    variant,
    data: output.data,
    width: output.info.width,
    height: output.info.height,
    contentType: outputContentType(format),
  } satisfies OptimisedMarketImage;
}

export async function optimiseMarketListingImage(input: Buffer, format: MarketImageFormat = "webp"): Promise<OptimisedMarketImageSet> {
  if (!input.byteLength || input.byteLength > MAX_MARKET_LISTING_IMAGE_BYTES) {
    throw new Error("Image files must be between 1 byte and 4MB.");
  }

  const source = sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_MARKET_LISTING_IMAGE_PIXELS,
    sequentialRead: true,
  });
  const metadata = await source.metadata();
  if (!metadata.format || !acceptedFormats.has(metadata.format) || !metadata.width || !metadata.height) {
    throw new Error("Unsupported or invalid image file.");
  }

  const [thumbnail, listing, detail] = await Promise.all([
    encodeVariant(input, "thumbnail", format),
    encodeVariant(input, "listing", format),
    encodeVariant(input, "detail", format),
  ]);

  return {
    format,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    images: { thumbnail, listing, detail },
  };
}
