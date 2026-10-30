"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { readApiResponse } from "@/lib/api/client";

const translationResponseSchema = z.object({
  description: z.string().min(1),
  locale: z.enum(["en", "ko", "zh", "ja", "es", "hi", "ar"]),
});

type ListingDescriptionTranslationProps = {
  description: string;
  onChange: (translation: string | null) => void;
  /** "chip" is the phone layout's quiet pill under the text, in the reader's language. */
  variant?: "button" | "chip";
};

export function ListingDescriptionTranslation({ description, onChange, variant = "button" }: ListingDescriptionTranslationProps) {
  const { t } = useLanguage();
  const [translation, setTranslation] = useState<string | null>(null);
  const [isShowingTranslation, setIsShowingTranslation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTranslation(null);
    setIsShowingTranslation(false);
    setError(null);
    onChange(null);
  }, [description, onChange]);

  const handleTranslate = async () => {
    if (translation) {
      const nextIsShowingTranslation = !isShowingTranslation;
      setIsShowingTranslation(nextIsShowingTranslation);
      onChange(nextIsShowingTranslation ? translation : null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/translate-listing-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const result = await readApiResponse(response, translationResponseSchema);
      if (!result.data) {
        setError(result.error?.message ?? "Unable to translate this description right now.");
        return;
      }
      setTranslation(result.data.description);
      setIsShowingTranslation(true);
      onChange(result.data.description);
    } catch {
      setError("Unable to translate this description right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const label = isLoading ? t("listingTranslating") : isShowingTranslation ? t("listingShowOriginal") : t("listingTranslate");

  return <div className={`listing-description-translation ${variant === "chip" ? "is-chip" : ""}`}>
    {variant === "chip"
      ? <button type="button" className="listing-description-translate-chip" disabled={isLoading} onClick={() => void handleTranslate()}>{label}</button>
      : <Button variant="secondary" size="sm" className="listing-description-translate-button" disabled={isLoading} onClick={() => void handleTranslate()}>
        {isLoading ? "Translating..." : isShowingTranslation ? "Show original" : "Translate"}
      </Button>}
    {error ? <p className="listing-description-translate-error" role="alert">{error}</p> : null}
  </div>;
}
