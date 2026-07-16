"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type PhotoForAi = { file: File };

type GeneratedListing = {
  description: string;
  conditionSummary: string;
  suggestedTags: string[];
  warnings: string[];
};

type AiListingGeneratorProps = {
  title: string;
  category: string;
  price: string;
  condition: string;
  location: string;
  photos: PhotoForAi[];
  currentDescription: string;
  hasPreviousDescription: boolean;
  onUseDraft: (description: string, mode: "append" | "replace") => void;
  onRestorePreviousDescription: () => void;
};

const MAX_AI_IMAGE_DIMENSION = 1280;
const MAX_AI_IMAGES = 3;

function plainText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getErrorMessage(payload: unknown) {
  if (typeof payload !== "object" || !payload || !("error" in payload)) return null;
  const error = payload.error;
  if (typeof error !== "object" || !error || !("message" in error)) return null;
  return typeof error.message === "string" ? error.message : null;
}

function getGeneratedListing(payload: unknown): GeneratedListing | null {
  if (typeof payload !== "object" || !payload || !("success" in payload) || payload.success !== true || !("data" in payload)) return null;
  const data = payload.data;
  if (typeof data !== "object" || !data) return null;
  const { description, conditionSummary, suggestedTags, warnings } = data as Record<string, unknown>;
  if (
    typeof description !== "string"
    || typeof conditionSummary !== "string"
    || !Array.isArray(suggestedTags)
    || !suggestedTags.every((tag) => typeof tag === "string")
    || !Array.isArray(warnings)
    || !warnings.every((warning) => typeof warning === "string")
  ) return null;
  return { description, conditionSummary, suggestedTags, warnings };
}

async function createAiImageFile(file: File) {
  let sourceUrl: string | null = null;
  try {
    sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();

    const scale = Math.min(1, MAX_AI_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.78));
    return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "listing"}.webp`, { type: "image/webp" }) : file;
  } catch {
    return file;
  } finally {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }
}

export function AiListingGenerator({
  title,
  category,
  price,
  condition,
  location,
  photos,
  currentDescription,
  hasPreviousDescription,
  onUseDraft,
  onRestorePreviousDescription,
}: AiListingGeneratorProps) {
  const [purchasePeriod, setPurchasePeriod] = useState("");
  const [defects, setDefects] = useState("");
  const [includedItems, setIncludedItems] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<GeneratedListing | null>(null);
  const [needsChoice, setNeedsChoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const generate = async () => {
    const missingFields = [
      !title.trim() && "title",
      !category.trim() && "category",
      !condition.trim() && "condition",
      !location.trim() && "location",
    ].filter(Boolean);

    if (missingFields.length) {
      setError(`Add ${missingFields.join(", ")} before asking AI to create a description.`);
      return;
    }

    const numericPrice = Number(price.replace(/[^0-9.]/g, ""));
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("AI description generation is not configured yet.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus("상품 정보를 바탕으로 설명을 작성하고 있어요...");
    setNeedsChoice(false);

    const uploadedPaths: string[] = [];
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Please sign in before generating a description.");
        return;
      }

      for (const photo of photos.slice(0, MAX_AI_IMAGES)) {
        const aiFile = await createAiImageFile(photo.file);
        const extension = aiFile.name.split(".").pop()?.toLowerCase() || "webp";
        const path = `${user.id}/ai-drafts/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("market-listing-images").upload(path, aiFile, {
          cacheControl: "60",
          contentType: aiFile.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30_000);
      const response = await fetch("/api/ai/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim(),
          price: Number.isFinite(numericPrice) ? numericPrice : undefined,
          condition: condition.trim(),
          location: location.trim(),
          purchasePeriod,
          defects,
          includedItems,
          imagePaths: uploadedPaths,
          language: /[\u3131-\uD79D]/.test(`${title} ${category} ${condition} ${location}`) ? "ko" : "en",
        }),
      });
      window.clearTimeout(timeout);

      const payload: unknown = await response.json();
      const generated = getGeneratedListing(payload);
      if (!response.ok || !generated) {
        throw new Error(getErrorMessage(payload) ?? "Unable to create a listing description. Please try again shortly.");
      }

      setDraft(generated);
      setStatus("AI draft is ready. Review and edit it before posting.");
      if (plainText(currentDescription)) {
        setNeedsChoice(true);
      } else {
        onUseDraft(generated.description, "replace");
      }
    } catch (generationError) {
      setStatus(null);
      setError(generationError instanceof Error && generationError.name === "AbortError"
        ? "AI generation took too long. Please try again."
        : generationError instanceof Error
          ? generationError.message
          : "Unable to create a listing description. Please try again shortly.");
    } finally {
      if (uploadedPaths.length) {
        await supabase.storage.from("market-listing-images").remove(uploadedPaths);
      }
      setIsGenerating(false);
    }
  };

  return (
    <section className="post-ai-generator" aria-label="AI listing description generator">
      <div className="post-ai-details">
        <label>
          Purchase period or usage <span>Optional</span>
          <input value={purchasePeriod} maxLength={160} onChange={(event) => setPurchasePeriod(event.target.value)} placeholder="e.g. Purchased in 2023, used for one year" />
        </label>
        <label>
          Known marks or issues <span>Optional</span>
          <input value={defects} maxLength={1000} onChange={(event) => setDefects(event.target.value)} placeholder="Describe any marks, faults, or repairs" />
        </label>
        <label>
          Included items <span>Optional</span>
          <input value={includedItems} maxLength={600} onChange={(event) => setIncludedItems(event.target.value)} placeholder="e.g. Charger, box, spare parts" />
        </label>
      </div>
      <div className="post-ai-action-row">
        <button className="post-ai-generate-button" type="button" disabled={isGenerating} aria-busy={isGenerating} onClick={() => void generate()}>
          <i className={`fa-solid ${isGenerating ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"}`} aria-hidden="true" />
          <span>{isGenerating ? "Creating draft..." : "AI로 설명 만들기"}</span>
        </button>
        <p>AI creates an editable draft only. It never posts your listing automatically.</p>
      </div>

      <div className="post-ai-live-region" aria-live="polite" aria-atomic="true">
        {status && <p className="post-ai-status">{status}</p>}
        {error && <p className="post-ai-error" role="alert">{error}</p>}
      </div>

      {draft && (
        <aside className="post-ai-preview" aria-label="AI listing draft preview">
          <div className="post-ai-preview-heading">
            <span>AI draft preview</span>
            {hasPreviousDescription && <button type="button" onClick={onRestorePreviousDescription}>Restore previous description</button>}
          </div>
          <p><strong>Condition:</strong> {draft.conditionSummary}</p>
          {draft.suggestedTags.length > 0 && <div className="post-ai-tags" aria-label="Suggested search tags">{draft.suggestedTags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          {draft.warnings.length > 0 && <ul className="post-ai-warnings">{draft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
          {needsChoice && (
            <div className="post-ai-choice" role="group" aria-label="Choose how to use the AI draft">
              <p>Your existing description has not been changed.</p>
              <button type="button" onClick={() => { onUseDraft(draft.description, "append"); setNeedsChoice(false); }}>Add below existing</button>
              <button type="button" onClick={() => { onUseDraft(draft.description, "replace"); setNeedsChoice(false); }}>Replace with AI draft</button>
              <button type="button" onClick={() => setNeedsChoice(false)}>Keep existing</button>
            </div>
          )}
        </aside>
      )}
    </section>
  );
}
