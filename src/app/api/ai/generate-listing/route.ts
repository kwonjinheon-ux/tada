import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ListingAiError,
  createListingInputHash,
  createSafetyIdentifier,
  generateListingDraft,
  isOwnedAiDraftImagePath,
  listingAiRequestSchema,
} from "@/lib/ai/listing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEATURE = "listing_description";
const MAX_GENERATIONS_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const DUPLICATE_WINDOW_MS = 45 * 1_000;
const IMAGE_BUCKET = "market-listing-images";

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
    return failure("UNAUTHORIZED", "Please sign in to generate a listing description.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("INVALID_REQUEST", "Please check the listing details and try again.", 400);
  }

  const parsed = listingAiRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error instanceof ZodError
      ? "Please complete the title, category, condition, and location before generating a description."
      : "Please check the listing details and try again.";
    return failure("INVALID_REQUEST", message, 400);
  }

  const input = parsed.data;
  if (new Set(input.imagePaths).size !== input.imagePaths.length || !input.imagePaths.every((path) => isOwnedAiDraftImagePath(path, user.id))) {
    return failure("INVALID_IMAGE", "One or more listing images could not be verified.", 400);
  }

  const now = Date.now();
  const inputHash = createListingInputHash(input);
  const rateWindowStart = new Date(now - RATE_LIMIT_WINDOW_MS).toISOString();
  const { data: recentUsage, error: usageReadError } = await supabase
    .from("ai_generation_usage")
    .select("id, input_hash, created_at")
    .eq("user_id", user.id)
    .eq("feature", FEATURE)
    .gte("created_at", rateWindowStart)
    .order("created_at", { ascending: false });

  if (usageReadError || !recentUsage) {
    console.error("Unable to read AI generation usage", usageReadError);
    return failure("AI_GENERATION_FAILED", "Unable to prepare AI generation right now. Please try again shortly.");
  }

  if (recentUsage.length >= MAX_GENERATIONS_PER_WINDOW) {
    return failure("RATE_LIMITED", "You can generate up to 3 drafts every 10 minutes. Please try again shortly.", 429);
  }

  const duplicateRequest = recentUsage.find(
    (usage) => usage.input_hash === inputHash && now - new Date(usage.created_at).getTime() < DUPLICATE_WINDOW_MS,
  );
  if (duplicateRequest) {
    return failure("RATE_LIMITED", "This draft was requested very recently. Please wait a moment before trying again.", 429);
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

  let imageUrls: string[] = [];
  if (input.imagePaths.length) {
    const { data: signedImages, error: signedImagesError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .createSignedUrls(input.imagePaths, 60);

    imageUrls = signedImages?.flatMap((image) => image.signedUrl ? [image.signedUrl] : []) ?? [];
    if (signedImagesError || imageUrls.length !== input.imagePaths.length) {
      await supabase.from("ai_generation_usage").update({ status: "failed" }).eq("id", usage.id);
      console.error("Unable to sign AI listing images", signedImagesError);
      return failure("INVALID_IMAGE", "One or more listing images could not be prepared.", 400);
    }
  }

  try {
    const draft = await generateListingDraft({
      input,
      imageUrls,
      safetyIdentifier: createSafetyIdentifier(user.id),
    });
    await supabase.from("ai_generation_usage").update({ status: "success" }).eq("id", usage.id);
    return NextResponse.json({ success: true, data: draft });
  } catch (error) {
    await supabase.from("ai_generation_usage").update({ status: "failed" }).eq("id", usage.id);
    console.error("AI listing generation failed", error);

    if (error instanceof ListingAiError && error.code === "AI_NOT_CONFIGURED") {
      return failure("AI_NOT_CONFIGURED", "AI description generation is not configured yet.");
    }

    if (typeof error === "object" && error && "status" in error && error.status === 429) {
      return failure("RATE_LIMITED", "AI generation is busy right now. Please wait a moment and try again.", 429);
    }

    return failure("AI_GENERATION_FAILED", "Unable to create a listing description. Please try again shortly.");
  }
}
