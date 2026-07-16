"use client";

import { useEffect, useState } from "react";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState<GeneratedListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isGenerating) {
      setProgress(0);
      return;
    }

    setProgress(8);
    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(92, current + Math.max(3, Math.ceil((92 - current) * 0.18))));
    }, 850);

    return () => window.clearInterval(progressTimer);
  }, [isGenerating]);

  const generate = async () => {
    const description = plainText(currentDescription);
    if (!description) {
      setError("Write a description first, then AI can polish it for buyers.");
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
    setStatus("AI is polishing your description for buyers...");

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
          description,
          imagePaths: uploadedPaths,
          language: /[\u3131-\uD79D]/.test(`${title} ${category} ${condition} ${location} ${description}`) ? "ko" : "en",
        }),
      });
      window.clearTimeout(timeout);

      const payload: unknown = await response.json();
      const generated = getGeneratedListing(payload);
      if (!response.ok || !generated) {
        throw new Error(getErrorMessage(payload) ?? "Unable to create a listing description. Please try again shortly.");
      }

      setDraft(generated);
      setProgress(100);
      setStatus("AI draft is ready. Review and edit it before posting.");
      onUseDraft(generated.description, "replace");
      await new Promise((resolve) => window.setTimeout(resolve, 180));
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
      <div className="post-ai-action-row">
        {isGenerating ? (
          <div className="post-ai-progress" role="progressbar" aria-label="Creating AI description" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span className="post-ai-progress-fill" style={{ width: `${progress}%` }} />
            <span className="post-ai-progress-label">Creating AI draft {progress}%</span>
          </div>
        ) : (
          <button className="post-ai-generate-button" type="button" onClick={() => void generate()}>
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
            <span>AI로 판매 설명 다듬기</span>
          </button>
        )}
        <p>AI refines the description you wrote. It never posts your listing automatically.</p>
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
        </aside>
      )}
    </section>
  );
}
