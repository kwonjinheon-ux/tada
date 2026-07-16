import "server-only";

import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const listingAiRequestSchema = z
  .object({
    title: z.string().trim().max(100).optional().default(""),
    category: z.string().trim().max(100).optional().default(""),
    price: z.number().finite().min(0).max(100_000_000).optional(),
    condition: z.string().trim().max(100).optional().default(""),
    location: z.string().trim().max(160).optional().default(""),
    description: z.string().trim().min(1).max(6_000),
    imagePaths: z.array(z.string().trim().min(1).max(260)).max(3).optional().default([]),
    language: z.enum(["ko", "en"]).optional(),
  })
  .strip();

export const generatedListingSchema = z
  .object({
    description: z.string().trim().min(1).max(1_800),
    conditionSummary: z.string().trim().min(1).max(400),
    suggestedTags: z.array(z.string().trim().min(1).max(64)).max(5),
    warnings: z.array(z.string().trim().min(1).max(300)).max(6),
  })
  .strict();

export type ListingAiRequest = z.infer<typeof listingAiRequestSchema>;
export type GeneratedListing = z.infer<typeof generatedListingSchema>;

export class ListingAiError extends Error {
  constructor(
    public readonly code: "AI_NOT_CONFIGURED" | "AI_GENERATION_FAILED" | "AI_RESPONSE_INVALID",
  ) {
    super(code);
  }
}

function includesKorean(input: ListingAiRequest) {
  return /[\u3131-\uD79D]/.test(
    [input.title, input.category, input.condition, input.location, input.description]
      .join(" "),
  );
}

function buildListingPrompt(input: ListingAiRequest) {
  const language = input.language ?? (includesKorean(input) ? "ko" : "en");
  const localeInstruction = language === "ko"
    ? "한국어로 작성하고 본문은 약 150~300자로 제한하세요."
    : "Write in natural New Zealand English and keep the description to about 80–150 words.";

  return [
    "Polish the supplied marketplace description for Tada, a New Zealand second-hand marketplace.",
    "Write in the seller's own warm, natural first-person voice, as though they wrote the polished listing themselves.",
    "Use first-person wording where it fits naturally, such as 'I've used it for...' or 'I'm selling it because...'.",
    "Never refer to the seller in the third person or write phrases such as 'the seller says', 'according to the seller', '판매자 설명상', or '판매자가 언급하지 않았습니다'.",
    "Preserve the seller's facts, correct clear grammar and structure, and make the writing easy for buyers to scan without sounding like an advertisement or a formal report.",
    "Use only facts directly supplied in the listing details or clearly visible in the supplied images.",
    "Do not invent a brand, exact model, original price, purchase date, working condition, authenticity, material, dimensions, hidden damage, included accessories, warranty, safety claims, rarity, or delivery availability.",
    "State user-provided defects clearly. Do not use exaggerated marketing language or change the stated price.",
    "For conditionSummary, write a brief neutral summary of the provided condition only; do not attribute it to the seller or speculate about anything they did not mention.",
    "Do not repeat phone numbers, emails, addresses, or other sensitive personal information.",
    "Return a draft only. Never claim the listing has been published.",
    localeInstruction,
    "Listing details:",
    JSON.stringify({
      title: input.title,
      category: input.category,
      price: input.price,
      condition: input.condition,
      location: input.location,
      description: input.description,
    }),
  ].join("\n");
}

export function createListingInputHash(input: ListingAiRequest) {
  const { imagePaths: _imagePaths, ...hashableInput } = input;
  return createHash("sha256").update(JSON.stringify(hashableInput)).digest("hex");
}

export function createSafetyIdentifier(userId: string) {
  return createHash("sha256").update(userId).digest("hex");
}

export function isOwnedAiDraftImagePath(path: string, userId: string) {
  const prefix = `${userId}/ai-drafts/`;
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
  if (!apiKey) {
    throw new ListingAiError("AI_NOT_CONFIGURED");
  }

  const openai = new OpenAI({ apiKey, timeout: 25_000, maxRetries: 1 });
  const response = await openai.responses.parse({
    model: process.env.OPENAI_LISTING_MODEL?.trim() || "gpt-5-mini",
    safety_identifier: safetyIdentifier,
    max_output_tokens: 2_000,
    input: [
      {
        role: "developer",
        content: "You create careful, factual listing drafts. Follow the supplied instructions exactly.",
      },
      {
        role: "user",
        content: [
          { type: "input_text", text: buildListingPrompt(input) },
          ...imageUrls.map((imageUrl) => ({ type: "input_image" as const, image_url: imageUrl, detail: "low" as const })),
        ],
      },
    ],
    text: {
      format: zodTextFormat(generatedListingSchema, "tada_listing_draft"),
    },
  });

  if (!response.output_parsed) {
    console.error("AI listing response could not be parsed", {
      status: response.status,
      incompleteReason: response.incomplete_details?.reason,
      outputCount: response.output.length,
      hasRefusal: response.output.some(
        (item) => item.type === "message" && item.content.some((content) => content.type === "refusal"),
      ),
    });
    throw new ListingAiError("AI_RESPONSE_INVALID");
  }

  try {
    return generatedListingSchema.parse(response.output_parsed);
  } catch {
    console.error("AI listing parsed response did not match the expected shape");
    throw new ListingAiError("AI_RESPONSE_INVALID");
  }
}
