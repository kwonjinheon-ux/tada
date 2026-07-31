import "server-only";

import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const listingAiRequestSchema = z.object({
  title: z.string().trim().max(100).optional().default(""),
  condition: z.string().trim().max(100).optional().default(""),
  location: z.string().trim().max(160).optional().default(""),
  additionalDetails: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(240),
  }).strip()).max(12).optional().default([]),
  imagePaths: z.array(z.string().trim().min(1).max(260)).min(1).max(3),
  language: z.enum(["en", "ko", "zh", "ja", "es", "hi", "ar"]).optional().default("en"),
}).strip();

export const generatedListingSchema = z.object({
  title: z.string().trim().min(3).max(70),
  description: z.string().trim().min(60).max(1_600),
  visibleDetails: z.array(z.string().trim().min(1).max(160)).max(6),
  sellerConfirmation: z.array(z.string().trim().min(1).max(180)).max(4),
}).strict();

export type ListingAiRequest = z.infer<typeof listingAiRequestSchema>;
export type GeneratedListing = z.infer<typeof generatedListingSchema>;

export class ListingAiError extends Error {
  constructor(public readonly code: "AI_NOT_CONFIGURED" | "AI_GENERATION_FAILED" | "AI_RESPONSE_INVALID") {
    super(code);
  }
}

const languageNames: Record<ListingAiRequest["language"], string> = {
  en: "New Zealand English",
  ko: "Korean",
  zh: "Simplified Chinese",
  ja: "Japanese",
  es: "neutral Spanish",
  hi: "Hindi",
  ar: "Modern Standard Arabic",
};

function buildListingPrompt(input: ListingAiRequest) {
  return [
    "You are the photo-first listing writer for Tada, a New Zealand second-hand marketplace.",
    "Start by carefully analysing the supplied photographs. Identify the primary item being sold, then write a precise, searchable title and a natural listing description in the requested language.",
    `Write all customer-facing output in ${languageNames[input.language]}. Preserve a clearly visible brand name or model number in its usual spelling.`,
    "The seller may not have written a title or description. That is expected: use the photos as the primary source of truth and create the title yourself.",
    "Write the description in a warm first-person seller voice. It should read like a helpful real seller, not like an inventory report or an AI response. Briefly introduce the item, describe only visible or provided details, explain grounded practical appeal, and invite buyers to ask about details that cannot be confirmed.",
    "The title must name the actual item. Never use generic placeholders such as 'Marketplace item', 'Item for sale', or 'Product'. If the exact brand or model is not visible, use the most specific honest item type you can identify.",
    "Use only facts that are clearly visible in the images or explicitly provided below. Do not invent a brand, model, dimensions, age, material, included accessory, working condition, authenticity, defect, reason for sale, delivery promise, or history.",
    "Do not claim an electronic or mechanical item works unless operation is explicitly provided. Mention visible wear only if it is clear enough to support. Do not add a price.",
    "visibleDetails must contain only short confirmed observations. sellerConfirmation must list only details the seller should verify before publishing, such as operation, exact model, measurements, included accessories, or less-visible condition. Keep either array empty if none apply.",
    "Return only the requested JSON structure.",
    "Seller-provided context (use only when it agrees with the photos):",
    JSON.stringify({
      existingTitle: input.title,
      selectedCondition: input.condition,
      location: input.location,
      additionalDetails: input.additionalDetails,
    }),
  ].join("\n");
}

export function createListingInputHash(input: ListingAiRequest) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function createSafetyIdentifier(userId: string) {
  return createHash("sha256").update(userId).digest("hex");
}

export function isOwnedListingDraftImagePath(path: string, userId: string) {
  const prefix = `${userId}/drafts/`;
  const fileName = path.slice(prefix.length);
  return path.startsWith(prefix)
    && !path.includes("\\")
    && !path.includes("..")
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(fileName);
}

export async function generateListingDraft({
  input,
  imageUrls,
  safetyIdentifier,
}: {
  input: ListingAiRequest;
  imageUrls: string[];
  safetyIdentifier: string;
}): Promise<GeneratedListing> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ListingAiError("AI_NOT_CONFIGURED");

  const openai = new OpenAI({ apiKey, timeout: 48_000, maxRetries: 2 });
  const response = await openai.responses.parse({
    model: process.env.OPENAI_LISTING_MODEL?.trim() || "gpt-5-mini",
    safety_identifier: safetyIdentifier,
    max_output_tokens: 1_200,
    input: [
      { role: "developer", content: "Create accurate, photo-led marketplace drafts. Never guess facts to make a listing sound better." },
      {
        role: "user",
        content: [
          { type: "input_text", text: buildListingPrompt(input) },
          ...imageUrls.map((imageUrl, index) => ({
            type: "input_image" as const,
            image_url: imageUrl,
            detail: index === 0 ? "high" as const : "low" as const,
          })),
        ],
      },
    ],
    text: { format: zodTextFormat(generatedListingSchema, "tada_photo_listing_draft") },
  });

  if (!response.output_parsed) {
    console.error("AI listing response could not be parsed", {
      status: response.status,
      incompleteReason: response.incomplete_details?.reason,
      outputCount: response.output.length,
    });
    throw new ListingAiError("AI_RESPONSE_INVALID");
  }

  try {
    return generatedListingSchema.parse(response.output_parsed);
  } catch {
    throw new ListingAiError("AI_RESPONSE_INVALID");
  }
}
