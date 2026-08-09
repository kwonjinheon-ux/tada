import "server-only";

import OpenAI from "openai";

export const descriptionTranslationLocales = ["en", "ko", "zh", "ja", "es", "hi", "ar"] as const;
export type DescriptionTranslationLocale = (typeof descriptionTranslationLocales)[number];

const languageNames: Record<DescriptionTranslationLocale, string> = {
  en: "New Zealand English",
  ko: "Korean",
  zh: "Simplified Chinese",
  ja: "Japanese",
  es: "neutral Spanish",
  hi: "Hindi",
  ar: "Modern Standard Arabic",
};

export class DescriptionTranslationError extends Error {
  constructor(public readonly code: "AI_NOT_CONFIGURED" | "AI_TRANSLATION_FAILED" | "AI_REQUEST_TIMED_OUT") {
    super(code);
  }
}

export async function translateListingDescription({
  description,
  locale,
  safetyIdentifier,
}: {
  description: string;
  locale: DescriptionTranslationLocale;
  safetyIdentifier: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new DescriptionTranslationError("AI_NOT_CONFIGURED");

  const openai = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 });

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_LISTING_MODEL?.trim() || "gpt-5-mini",
      safety_identifier: safetyIdentifier,
      reasoning: { effort: "low" },
      max_output_tokens: 2_500,
      input: [
        {
          role: "developer",
          content: "Translate marketplace listing descriptions accurately. Return only the translation, preserve paragraph breaks, retain brand names, model names, measurements, prices, and all factual details exactly, and do not add commentary.",
        },
        {
          role: "user",
          content: `Translate this listing description into ${languageNames[locale]}:\n\n${description}`,
        },
      ],
    });

    const translation = response.output_text.trim();
    if (!translation) throw new DescriptionTranslationError("AI_TRANSLATION_FAILED");
    return translation;
  } catch (error) {
    if (error instanceof DescriptionTranslationError) throw error;
    if (error instanceof Error && (error.name === "APIConnectionTimeoutError" || error.name === "AbortError")) {
      throw new DescriptionTranslationError("AI_REQUEST_TIMED_OUT");
    }
    throw new DescriptionTranslationError("AI_TRANSLATION_FAILED");
  }
}
