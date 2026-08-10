import { NextResponse } from "next/server";
import {
  BargainItemAiError,
  bargainItemDescriptionRequestSchema,
  createBargainItemInputHash,
  generateBargainItemDescriptions,
} from "@/lib/ai/bargain-items";
import { createSafetyIdentifier, isOwnedListingDraftImagePath } from "@/lib/ai/listing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FEATURE = "bargain_item_descriptions";
const MAX_GENERATIONS_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const IMAGE_BUCKET = "bargain-listing-images";
const AI_IMAGE_URL_TTL_SECONDS = 5 * 60;
const isRateLimitEnabled = process.env.AI_LISTING_RATE_LIMIT_ENABLED !== "false";

function failure(code: string, message: string, status = 500) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return failure("AI_NOT_CONFIGURED", "AI description generation is not configured yet.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return failure("UNAUTHORIZED", "Please sign in to generate item descriptions.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("INVALID_REQUEST", "Please check the item details and try again.", 400);
  }

  const parsed = bargainItemDescriptionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return failure("INVALID_REQUEST", "Please add a photo for each item before generating descriptions.", 400);
  }

  const input = parsed.data;
  const imagePaths = input.items.map((item) => item.imagePath);
  if (new Set(imagePaths).size !== imagePaths.length || !imagePaths.every((path) => isOwnedListingDraftImagePath(path, user.id))) {
    return failure("INVALID_IMAGE", "One or more item photos could not be verified.", 400);
  }

  const now = Date.now();
  const inputHash = createBargainItemInputHash(input);
  const rateWindowStart = new Date(now - RATE_LIMIT_WINDOW_MS).toISOString();
  const { data: recentUsage, error: usageReadError } = await supabase
    .from("ai_generation_usage")
    .select("id, created_at")
    .eq("user_id", user.id)
    .eq("feature", FEATURE)
    .gte("created_at", rateWindowStart)
    .order("created_at", { ascending: false });

  if (usageReadError || !recentUsage) {
    console.error("Unable to read AI generation usage", usageReadError);
    return failure("AI_GENERATION_FAILED", "Unable to prepare AI generation right now. Please try again shortly.");
  }

  if (isRateLimitEnabled && recentUsage.length >= MAX_GENERATIONS_PER_WINDOW) {
    return failure("RATE_LIMITED", "You can generate up to 3 batches every 10 minutes. Please try again shortly.", 429);
  }

  const model = process.env.OPENAI_LISTING_MODEL?.trim() || "gpt-5-mini";
  const { data: usage, error: usageInsertError } = await supabase
    .from("ai_generation_usage")
    .insert({ user_id: user.id, feature: FEATURE, input_hash: inputHash, status: "started", model })
    .select("id")
    .single();

  if (usageInsertError || !usage) {
    console.error("Unable to create AI generation usage", usageInsertError);
    return failure("AI_GENERATION_FAILED", "Unable to prepare AI generation right now. Please try again shortly.");
  }

  const { data: signedImages, error: signedImagesError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(imagePaths, AI_IMAGE_URL_TTL_SECONDS);

  const imageUrls = signedImages?.flatMap((image) => image.signedUrl ? [image.signedUrl] : []) ?? [];
  if (signedImagesError || imageUrls.length !== imagePaths.length) {
    await supabase.from("ai_generation_usage").update({ status: "failed" }).eq("id", usage.id);
    console.error("Unable to sign bargain item images", signedImagesError);
    return failure("INVALID_IMAGE", "One or more item photos could not be prepared.", 400);
  }

  try {
    const result = await generateBargainItemDescriptions({
      input,
      imageUrls,
      safetyIdentifier: createSafetyIdentifier(user.id),
    });
    await supabase.from("ai_generation_usage").update({ status: "success" }).eq("id", usage.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Bargain item description generation failed", error);
    await supabase.from("ai_generation_usage").update({ status: "failed" }).eq("id", usage.id);

    if (error instanceof BargainItemAiError && error.code === "AI_NOT_CONFIGURED") {
      return failure("AI_NOT_CONFIGURED", "AI description generation is not configured yet.");
    }
    if (error instanceof BargainItemAiError && error.code === "AI_REQUEST_TIMED_OUT") {
      return failure("AI_REQUEST_TIMED_OUT", "Photo analysis took too long. Please try again; your uploaded photos are ready to use.", 504);
    }
    if (error instanceof BargainItemAiError && error.code === "AI_RESPONSE_INVALID") {
      return failure("AI_RESPONSE_INVALID", "We could not finish the item descriptions. Please try again.", 502);
    }
    return failure("AI_GENERATION_FAILED", "We could not generate item descriptions just now. Please try again in a moment.", 503);
  }
}
