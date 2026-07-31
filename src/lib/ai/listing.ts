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
    description: z.string().trim().max(6_000).optional().default(""),
    additionalDetails: z.array(z.object({
      label: z.string().trim().min(1).max(80),
      value: z.string().trim().min(1).max(240),
    }).strip()).max(12).optional().default([]),
    imagePaths: z.array(z.string().trim().min(1).max(260)).max(3).optional().default([]),
    language: z.enum(["en", "ko", "zh", "ja", "es", "hi", "ar"]).optional(),
  })
  .strip();

export const generatedListingSchema = z
  .object({
    title: z.string().trim().min(1).max(70),
    category: z.string().trim().min(1).max(100).nullable(),
    subcategory: z.string().trim().min(1).max(100).nullable(),
    brand: z.string().trim().min(1).max(100).nullable(),
    model: z.string().trim().min(1).max(120).nullable(),
    condition: z.enum(["New", "Like New", "Good", "Fair", "For Parts", "Unknown"]),
    conditionReason: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(1_800),
    keyFeatures: z.array(z.string().trim().min(1).max(180)).max(12),
    visibleDefects: z.array(z.string().trim().min(1).max(240)).max(12),
    colour: z.string().trim().min(1).max(100).nullable(),
    includedItems: z.array(z.string().trim().min(1).max(160)).max(12),
    suggestedSearchKeywords: z.array(z.string().trim().min(1).max(64)).max(10),
    confidence: z.enum(["low", "medium", "high"]),
    missingInformation: z.array(z.string().trim().min(1).max(240)).max(12),
    requiresManualReview: z.boolean(),
    reviewReason: z.string().trim().min(1).max(500).nullable(),
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

const genericListingTitles = new Set([
  "item",
  "item for sale",
  "listing item",
  "marketplace item",
  "marketplace listing",
  "product",
  "product for sale",
  "selling item",
  "판매 상품",
  "판매 물품",
  "중고 물품",
]);

export function isGenericListingTitle(value: string) {
  const normalized = value.trim().toLocaleLowerCase().replace(/[.!?]+$/g, "");
  return !normalized || genericListingTitles.has(normalized);
}

function buildListingPrompt(input: ListingAiRequest) {
  return [
    "You create accurate second-hand marketplace listings from product photographs.",
    "Analyse every supplied image carefully and return only valid JSON matching the required schema.",
    "Identify the main item being sold and create a concise, searchable title of no more than 70 characters. Use Brand + model + item type + distinguishing feature when those details are clearly visible or explicitly supplied.",
    "Describe only details supported by the photographs or explicit seller inputs. Identify visible branding, model information, colour, materials, features, accessories, and defects. If text or a logo is unclear, return null instead of guessing.",
    "Never invent a brand, model, specification, size, age, capacity, material, condition, function, accessory, authenticity, price, purchase history, warranty, shipping, payment, or collection details.",
    "Do not claim an electronic or mechanical item works unless operation is visibly demonstrated or explicitly confirmed by the seller. When working condition cannot be confirmed, say so in the description and add it to missingInformation.",
    "If multiple items appear, identify the most likely primary item and record the ambiguity in missingInformation.",
    "Record every visible scratch, stain, dent, crack, missing part, fading, or other wear in visibleDefects. Do not hide defects or use misleading advertising language.",
    "Write the description as a trustworthy private seller in clear, friendly New Zealand English. Keep it concise and easy to scan. Explain what the item is, its visible condition, included items, and what the buyer should confirm. Do not refer to yourself as an AI and do not say 'according to the image'.",
    "Use these condition definitions exactly: New = appears unused and in original or equivalent new condition; Like New = minimal or no visible use but cannot be confirmed unused; Good = normal light wear with no major visible damage; Fair = noticeable wear, marks, damage, or missing elements but still potentially usable; For Parts = significant damage or visible incompleteness suggesting repair or parts use; Unknown = insufficient photographic evidence.",
    "Clearly separate confirmed facts from uncertainty using conditionReason and missingInformation. Set confidence to low, medium, or high based on identification certainty.",
    "Set requiresManualReview to true and explain reviewReason for goods that may require legal, safety, authenticity, or marketplace-policy review. Otherwise set requiresManualReview to false and reviewReason to null.",
    "Never use generic titles such as 'Marketplace item', 'Item for sale', 'Product', or equivalent placeholders. Avoid emojis, excessive capitalisation, promotional language, and unsupported claims such as 'perfect condition'.",
    "Do not generate or recommend a selling price. Return a draft only and never claim it has been published.",
    "Listing details:",
    JSON.stringify({
      title: input.title,
      category: input.category,
      price: input.price,
      condition: input.condition,
      location: input.location,
      description: input.description,
      additionalDetails: input.additionalDetails,
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

export function createListingFallbackDraft(input: ListingAiRequest): GeneratedListing {
  const categoryTitle = input.category.split("/").map((part) => part.trim()).filter(Boolean).at(-1);
  const title = (input.title || categoryTitle || "Title needs review").slice(0, 70);
  const detailLines = input.additionalDetails.map(({ label, value }) => `${label}: ${value}.`);
  const description = [
    `I'm selling ${title}${input.condition ? ` in ${input.condition} condition` : ""}.`,
    input.description || "Please review the photos carefully and get in touch if you would like to know more.",
    ...detailLines,
    input.location ? `The seller provided ${input.location} as the listing location.` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 1_800);
  const suggestedTags = [input.category, input.condition]
    .flatMap((value) => value.split(/[\s/,]+/))
    .map((value) => value.trim().slice(0, 64))
    .filter(Boolean)
    .slice(0, 5);
  const categoryParts = input.category.split("/").map((part) => part.trim()).filter(Boolean);
  const selectedCondition = input.condition.toLocaleLowerCase();
  const condition = selectedCondition.includes("brand new") || selectedCondition === "new"
    ? "New"
    : selectedCondition.includes("like new")
      ? "Like New"
      : selectedCondition.includes("good")
        ? "Good"
        : selectedCondition.includes("fair")
          ? "Fair"
          : "Unknown";

  return generatedListingSchema.parse({
    title,
    category: categoryParts[0] || null,
    subcategory: categoryParts[1] || null,
    brand: null,
    model: null,
    condition,
    conditionReason: input.condition
      ? `The seller selected ${input.condition}; this could not be independently verified while image analysis was unavailable.`
      : "The available details are not sufficient to assess condition.",
    description,
    keyFeatures: [],
    visibleDefects: [],
    colour: null,
    includedItems: [],
    suggestedSearchKeywords: suggestedTags.length ? suggestedTags : ["marketplace"],
    confidence: "low",
    missingInformation: ["Confirm the exact item identity, visible condition, included items, and working operation before posting."],
    requiresManualReview: true,
    reviewReason: "ChatGPT was temporarily unavailable, so the photo analysis must be reviewed manually.",
  });
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

  const openai = new OpenAI({ apiKey, timeout: 24_000, maxRetries: 1 });
  const response = await openai.responses.parse({
    model: process.env.OPENAI_LISTING_MODEL?.trim() || "gpt-5-mini",
    safety_identifier: safetyIdentifier,
    max_output_tokens: 1_200,
    input: [
      {
        role: "developer",
        content: "You create careful, factual listing drafts. Follow the supplied instructions exactly.",
      },
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
    const draft = generatedListingSchema.parse(response.output_parsed);
    if (imageUrls.length > 0 && isGenericListingTitle(draft.title)) {
      console.error("AI listing response used a generic title despite image input", { title: draft.title });
      throw new ListingAiError("AI_RESPONSE_INVALID");
    }
    return draft;
  } catch {
    console.error("AI listing parsed response did not match the expected shape");
    throw new ListingAiError("AI_RESPONSE_INVALID");
  }
}
