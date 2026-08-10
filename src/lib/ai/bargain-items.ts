import "server-only";

import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const bargainItemDescriptionRequestSchema = z.object({
  language: z.enum(["en", "ko", "zh", "ja", "es", "hi", "ar"]).optional().default("en"),
  items: z.array(z.object({
    id: z.string().trim().min(1).max(64),
    title: z.string().trim().max(100).optional().default(""),
    imagePath: z.string().trim().min(1).max(260),
  })).min(1).max(10),
}).strip();

export const bargainItemDescriptionsSchema = z.object({
  items: z.array(z.object({
    id: z.string().trim().min(1).max(64),
    description: z.string().trim().min(10).max(400),
  })).min(1).max(10),
}).strict();

export type BargainItemDescriptionRequest = z.infer<typeof bargainItemDescriptionRequestSchema>;
export type BargainItemDescriptions = z.infer<typeof bargainItemDescriptionsSchema>;

export class BargainItemAiError extends Error {
  constructor(
    public readonly code: "AI_NOT_CONFIGURED" | "AI_GENERATION_FAILED" | "AI_RESPONSE_INVALID" | "AI_REQUEST_TIMED_OUT",
  ) {
    super(code);
  }
}

const languageNames: Record<BargainItemDescriptionRequest["language"], string> = {
  en: "New Zealand English",
  ko: "Korean",
  zh: "Simplified Chinese",
  ja: "Japanese",
  es: "neutral Spanish",
  hi: "Hindi",
  ar: "Modern Standard Arabic",
};

function buildPrompt(input: BargainItemDescriptionRequest) {
  return [
    "You are writing short marketplace captions for individual items in a garage or moving sale.",
    `Write every description in ${languageNames[input.language]}.`,
    "For each item listed below, look only at that item's own photo. Write exactly two short sentences: the first names what the item is, the second adds one useful visible detail (condition, material, size, or similar).",
    "Use only facts clearly visible in the photo. A seller-provided title may be used as context but must not be the whole description, and never invent a brand, defect, age, or working condition that isn't visible.",
    "Never use a generic placeholder such as 'Item for sale'. Return exactly one entry per item id, matching the ids given, in the same order.",
  ].join("\n");
}

export function createBargainItemInputHash(input: BargainItemDescriptionRequest) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function generateBargainItemDescriptions({
  input,
  imageUrls,
  safetyIdentifier,
}: {
  input: BargainItemDescriptionRequest;
  imageUrls: string[];
  safetyIdentifier: string;
}): Promise<BargainItemDescriptions> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new BargainItemAiError("AI_NOT_CONFIGURED");

  // SDK retries can consume the entire serverless execution window. A bounded
  // single attempt leaves room for the client to retry with the same photos.
  const openai = new OpenAI({ apiKey, timeout: 45_000, maxRetries: 0 });

  const itemsContent = input.items.flatMap((item, index) => [
    { type: "input_text" as const, text: `Item id: ${item.id}${item.title ? ` — seller title: ${item.title}` : ""}` },
    { type: "input_image" as const, image_url: imageUrls[index], detail: "low" as const },
  ]);

  let response;
  try {
    response = await openai.responses.parse({
      model: process.env.OPENAI_LISTING_MODEL?.trim() || "gpt-5-mini",
      safety_identifier: safetyIdentifier,
      reasoning: { effort: "low" },
      max_output_tokens: 1_400,
      input: [
        { role: "developer", content: "Create accurate, photo-led item captions. Never guess facts to make an item sound better." },
        { role: "user", content: [{ type: "input_text", text: buildPrompt(input) }, ...itemsContent] },
      ],
      text: { format: zodTextFormat(bargainItemDescriptionsSchema, "tada_bargain_item_descriptions") },
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "APIConnectionTimeoutError" || error.name === "AbortError")) {
      throw new BargainItemAiError("AI_REQUEST_TIMED_OUT");
    }
    throw new BargainItemAiError("AI_GENERATION_FAILED");
  }

  if (!response.output_parsed) {
    console.error("Bargain item description response could not be parsed", {
      status: response.status,
      incompleteReason: response.incomplete_details?.reason,
      outputCount: response.output.length,
    });
    throw new BargainItemAiError("AI_RESPONSE_INVALID");
  }

  try {
    return bargainItemDescriptionsSchema.parse(response.output_parsed);
  } catch {
    throw new BargainItemAiError("AI_RESPONSE_INVALID");
  }
}
