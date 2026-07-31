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

const itemIdentitySchema = z
  .object({
    title: z.string().trim().min(1).max(70),
    category: z.string().trim().min(1).max(100).nullable(),
    subcategory: z.string().trim().min(1).max(100).nullable(),
    brand: z.string().trim().min(1).max(100).nullable(),
    model: z.string().trim().min(1).max(120).nullable(),
    colour: z.string().trim().min(1).max(100).nullable(),
    itemType: z.string().trim().min(1).max(120),
    confidence: z.enum(["low", "medium", "high"]),
    missingInformation: z.array(z.string().trim().min(1).max(240)).max(8),
  })
  .strict();

export type ListingAiRequest = z.infer<typeof listingAiRequestSchema>;
export type GeneratedListing = z.infer<typeof generatedListingSchema>;
type ItemIdentity = z.infer<typeof itemIdentitySchema>;

export type ListingGenerationResult = {
  draft: GeneratedListing;
  fallback: boolean;
};

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
  "title needs review",
  "판매 상품",
  "판매 물품",
  "중고 물품",
]);

export function isGenericListingTitle(value: string) {
  const normalized = value.trim().toLocaleLowerCase().replace(/[.!?]+$/g, "");
  return !normalized || genericListingTitles.has(normalized);
}

function buildIdentityPrompt(input: ListingAiRequest) {
  return [
    "Identify the single main second-hand item shown across the supplied photographs before writing any listing copy.",
    "Return only the required JSON. Use the first photograph as the primary view and the others only as supporting views.",
    "Inspect the dominant object, visible labels, logos, printed text, controls, shape, materials, colour, and included parts. Use these clues to determine the most precise supported item name.",
    "Create a specific, searchable title of at most 70 characters. The title must name the actual object, not merely its marketplace category. Use brand + model + item type + distinguishing feature only when visible.",
    "If brand or model text is not clearly readable, return null instead of guessing, but still identify the concrete item type. A broad but visually supported title such as 'Black dual-camera smartphone' is acceptable.",
    "Never return a placeholder such as 'Marketplace item', 'Item for sale', 'Product', or 'Unknown item'.",
    "Treat the existing title as an unverified clue. Correct it when the photographs support a more accurate name; do not copy a generic, unrelated, or inaccurate title.",
    "Do not infer operation, authenticity, capacity, size, age, ownership, or accessories that are not visible.",
    "If several possible sale items appear, choose the most visually prominent item and record the ambiguity in missingInformation.",
    `Preferred title language: ${input.language ?? "en"}. Keep recognised brand and model names unchanged.`,
    "Seller-provided clues are context, not proof:",
    JSON.stringify({
      title: input.title,
      category: input.category,
      condition: input.condition,
      additionalDetails: input.additionalDetails,
    }),
  ].join("\n");
}

function buildListingPrompt(input: ListingAiRequest, identity: ItemIdentity | null) {
  const languageInstruction = input.language === "ko"
    ? "Write the title and description in natural Korean as a local private seller would write them."
    : `Write the title and description in natural ${input.language ?? "en"} for the selected app language. Use New Zealand English when the language is en.`;

  return [
    "You create accurate second-hand marketplace listings from product photographs.",
    "Return only valid JSON matching the required schema. Analyse the photographs and use the verified identity supplied below.",
    "Describe only details supported by the photographs, verified identity, or explicit seller inputs. If text or a logo is unclear, return null.",
    "Never invent a brand, model, specification, size, age, capacity, material, condition, function, accessory, authenticity, price, purchase history, warranty, shipping, payment, or collection detail.",
    "Do not claim an electronic or mechanical item works unless operation is visibly demonstrated or explicitly confirmed by the seller. When working condition cannot be confirmed, say so in the description and add it to missingInformation.",
    "If multiple items appear, identify the most likely primary item and record the ambiguity in missingInformation.",
    "Record every visible scratch, stain, dent, crack, missing part, fading, or other wear in visibleDefects. Do not hide defects or use misleading advertising language.",
    languageInstruction,
    "Write a genuine, fluent private-seller listing, not a product specification sheet or a list of form fields. Open naturally with what is being offered, then weave the confirmed strengths and practical buyer value into complete sentences, honestly describe visible condition, and close with a simple invitation to ask questions.",
    "Use a warm first-person seller voice such as 'I'm selling...' when appropriate, but never invent a reason for selling, ownership history, use history, or performance claim. Do not use robotic phrases such as 'visible details support', 'the seller selected', or 'according to the image'.",
    "Use two or three short paragraphs when the available facts support them. Keep the description concise, easy to scan, and buyer-friendly without exaggerated marketing language.",
    "Use these condition definitions exactly: New = appears unused and in original or equivalent new condition; Like New = minimal or no visible use but cannot be confirmed unused; Good = normal light wear with no major visible damage; Fair = noticeable wear, marks, damage, or missing elements but still potentially usable; For Parts = significant damage or visible incompleteness suggesting repair or parts use; Unknown = insufficient photographic evidence.",
    "Clearly separate confirmed facts from uncertainty using conditionReason and missingInformation. Set confidence to low, medium, or high based on identification certainty.",
    "Set requiresManualReview to true and explain reviewReason for goods that may require legal, safety, authenticity, or marketplace-policy review. Otherwise set requiresManualReview to false and reviewReason to null.",
    "Never use generic titles such as 'Marketplace item', 'Item for sale', 'Product', or equivalent placeholders. Avoid emojis, excessive capitalisation, promotional language, and unsupported claims such as 'perfect condition'.",
    "Do not generate or recommend a selling price. Return a draft only and never claim it has been published.",
    "Listing details:",
    JSON.stringify({
      verifiedPhotoIdentity: identity,
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

async function identifyListingItem({
  apiKey,
  input,
  imageUrls,
  safetyIdentifier,
}: {
  apiKey: string;
  input: ListingAiRequest;
  imageUrls: string[];
  safetyIdentifier: string;
}) {
  if (!imageUrls.length) return null;

  const openai = new OpenAI({ apiKey, timeout: 18_000, maxRetries: 0 });
  const response = await openai.responses.parse({
    model: process.env.OPENAI_LISTING_VISION_MODEL?.trim()
      || process.env.OPENAI_LISTING_MODEL?.trim()
      || "gpt-5-mini",
    safety_identifier: safetyIdentifier,
    max_output_tokens: 500,
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: buildIdentityPrompt(input) },
        ...imageUrls.map((imageUrl, index) => ({
          type: "input_image" as const,
          image_url: imageUrl,
          detail: index === 0 ? "high" as const : "low" as const,
        })),
      ],
    }],
    text: {
      format: zodTextFormat(itemIdentitySchema, "tada_item_identity"),
    },
  });

  const identity = itemIdentitySchema.parse(response.output_parsed);
  if (isGenericListingTitle(identity.title)) {
    throw new ListingAiError("AI_RESPONSE_INVALID");
  }
  return identity;
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

export function createListingFallbackDraft(
  input: ListingAiRequest,
  identity: ItemIdentity | null = null,
): GeneratedListing {
  const categoryTitle = input.category.split("/").map((part) => part.trim()).filter(Boolean).at(-1);
  const title = (identity?.title || input.title || categoryTitle || "Title needs review").slice(0, 70);
  const detailLines = input.additionalDetails.map(({ label, value }) => `${label}: ${value}.`);
  const description = [
    `I'm selling ${title}${input.condition ? ` in ${input.condition} condition` : ""}.`,
    input.description || "Please review the photos carefully and get in touch if you would like to know more.",
    detailLines.length ? `A few details worth noting: ${detailLines.join(" ")}` : "",
    "Please check the photos and confirm any details that matter to you before posting.",
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
    category: identity?.category || categoryParts[0] || null,
    subcategory: identity?.subcategory || categoryParts[1] || null,
    brand: identity?.brand || null,
    model: identity?.model || null,
    condition,
    conditionReason: input.condition
      ? `The seller selected ${input.condition}; this could not be independently verified while image analysis was unavailable.`
      : "The available details are not sufficient to assess condition.",
    description,
    keyFeatures: [],
    visibleDefects: [],
    colour: identity?.colour || null,
    includedItems: [],
    suggestedSearchKeywords: suggestedTags.length ? suggestedTags : ["marketplace"],
    confidence: identity?.confidence || "low",
    missingInformation: [
      ...(identity?.missingInformation ?? []),
      "Confirm the visible condition, included items, and working operation before posting.",
    ].slice(0, 12),
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
}): Promise<ListingGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ListingAiError("AI_NOT_CONFIGURED");
  }

  let identity: ItemIdentity | null = null;
  try {
    identity = await identifyListingItem({ apiKey, input, imageUrls, safetyIdentifier });
  } catch (error) {
    console.warn("Focused AI item identification did not complete; continuing with full analysis", error);
  }

  const openai = new OpenAI({ apiKey, timeout: 36_000, maxRetries: 0 });
  try {
    const response = await openai.responses.parse({
      model: process.env.OPENAI_LISTING_MODEL?.trim() || "gpt-5-mini",
      safety_identifier: safetyIdentifier,
      max_output_tokens: 1_400,
      input: [
        {
          role: "developer",
          content: "Create a careful, factual marketplace draft. Follow the evidence rules and output schema exactly.",
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: buildListingPrompt(input, identity) },
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

    const draft = generatedListingSchema.parse(response.output_parsed);
    const resolvedDraft = identity
      ? generatedListingSchema.parse({
        ...draft,
        title: identity.title,
        category: draft.category || identity.category,
        subcategory: draft.subcategory || identity.subcategory,
        brand: draft.brand || identity.brand,
        model: draft.model || identity.model,
        colour: draft.colour || identity.colour,
        confidence: identity.confidence,
        missingInformation: [...new Set([
          ...draft.missingInformation,
          ...identity.missingInformation,
        ])].slice(0, 12),
      })
      : draft;

    if (imageUrls.length > 0 && isGenericListingTitle(resolvedDraft.title)) {
      console.error("AI listing response used a generic title despite image input", { title: draft.title });
      throw new ListingAiError("AI_RESPONSE_INVALID");
    }
    return { draft: resolvedDraft, fallback: false };
  } catch (error) {
    if (identity) {
      console.warn("Full AI listing generation failed; preserving focused photo identification", error);
      return { draft: createListingFallbackDraft(input, identity), fallback: true };
    }
    console.error("AI listing generation did not produce a valid structured response", error);
    throw error instanceof ListingAiError ? error : new ListingAiError("AI_RESPONSE_INVALID");
  }
}
