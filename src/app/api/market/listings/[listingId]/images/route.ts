import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  getMarketListingImagePaths,
  MARKET_LISTING_IMAGE_BUCKET,
  MARKET_LISTING_IMAGE_CACHE_CONTROL,
  MAX_MARKET_LISTING_IMAGE_BYTES,
  optimiseMarketListingImage,
} from "@/lib/images/market-listing-images";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  const storage = createSupabaseServiceClient();
  if (!supabase || !storage) return badRequest("Image processing is unavailable right now.", 503);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return badRequest("Please log in to upload photos.", 401);

  const { listingId } = await params;
  const { data: listing } = await supabase
    .from("market_listings")
    .select("id,owner_id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return badRequest("Listing not found.", 404);
  if (listing.owner_id !== user.id) return badRequest("You cannot upload photos for this listing.", 403);

  const formData = await request.formData().catch(() => null);
  const image = formData?.get("image");
  const displayOrder = Number(formData?.get("displayOrder") ?? "0");
  const isPrimary = formData?.get("isPrimary") === "true";
  if (!(image instanceof File)) return badRequest("An image file is required.");
  if (!acceptedMimeTypes.has(image.type.toLowerCase())) return badRequest("Only JPEG, PNG, HEIC, and WebP images are supported.");
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 9) return badRequest("Invalid photo order.");
  if (!image.size || image.size > MAX_MARKET_LISTING_IMAGE_BYTES) return badRequest("Images must be 4MB or smaller.");

  try {
    const optimised = await optimiseMarketListingImage(Buffer.from(await image.arrayBuffer()));
    const photoId = randomUUID();
    const paths = getMarketListingImagePaths({ userId: user.id, listingId, photoId, format: optimised.format });
    const uploads = [
      [paths.thumbnail, optimised.images.thumbnail],
      [paths.listing, optimised.images.listing],
      [paths.detail, optimised.images.detail],
    ] as const;

    const uploadedPaths: string[] = [];
    for (const [path, output] of uploads) {
      const { error } = await storage.storage.from(MARKET_LISTING_IMAGE_BUCKET).upload(path, output.data, {
        contentType: output.contentType,
        cacheControl: MARKET_LISTING_IMAGE_CACHE_CONTROL,
        upsert: false,
      });
      if (error) throw new Error("Unable to store the optimised image.");
      uploadedPaths.push(path);
    }

    const { error: insertError } = await storage.from("market_listing_photos").insert({
      listing_id: listingId,
      owner_id: user.id,
      storage_bucket: MARKET_LISTING_IMAGE_BUCKET,
      storage_path: paths.detail,
      thumbnail_path: paths.thumbnail,
      listing_path: paths.listing,
      detail_path: paths.detail,
      original_name: null,
      mime_type: optimised.images.detail.contentType,
      size_bytes: optimised.images.detail.data.byteLength,
      width: optimised.images.detail.width,
      height: optimised.images.detail.height,
      image_format: optimised.format,
      display_order: displayOrder,
      is_primary: isPrimary,
    });
    if (insertError) {
      await storage.storage.from(MARKET_LISTING_IMAGE_BUCKET).remove(uploadedPaths);
      throw new Error("Unable to save the image record.");
    }

    return NextResponse.json({
      thumbnailPath: paths.thumbnail,
      listingPath: paths.listing,
      detailPath: paths.detail,
      width: optimised.images.detail.width,
      height: optimised.images.detail.height,
    }, { status: 201 });
  } catch (error) {
    console.error("Market image optimisation failed", error);
    return badRequest("We could not process this image. Please try a different photo.", 422);
  }
}
