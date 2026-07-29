export const marketListingImagePolicy = {
  acceptedMimeTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
  maxInputBytes: 5 * 1024 * 1024,
  maxCount: 10,
  maxEdge: 2_000,
  outputMimeType: "image/webp",
  outputQuality: 0.84,
} as const;

export function isAcceptedMarketListingImage(file: File) {
  return marketListingImagePolicy.acceptedMimeTypes.has(file.type) && file.size <= marketListingImagePolicy.maxInputBytes;
}

export async function normalizeMarketListingImage(file: File): Promise<File> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const scale = Math.min(1, marketListingImagePolicy.maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare this image.");
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, marketListingImagePolicy.outputMimeType, marketListingImagePolicy.outputQuality));
    if (!blob) throw new Error("Unable to prepare this image.");
    const baseName = file.name.replace(/\.[^.]+$/, "") || "listing-image";
    return new File([blob], `${baseName}.webp`, { type: marketListingImagePolicy.outputMimeType, lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
