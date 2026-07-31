"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type PhotoForAi = { file: File; isPrimary?: boolean };
type AiDetail = { label: string; value: string };

type GeneratedListing = {
  title: string;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  condition: "New" | "Like New" | "Good" | "Fair" | "For Parts" | "Unknown";
  conditionReason: string;
  description: string;
  keyFeatures: string[];
  visibleDefects: string[];
  colour: string | null;
  includedItems: string[];
  suggestedSearchKeywords: string[];
  confidence: "low" | "medium" | "high";
  missingInformation: string[];
  requiresManualReview: boolean;
  reviewReason: string | null;
};

type AiListingGeneratorProps = {
  title: string;
  category: string;
  price: string;
  condition: string;
  location: string;
  language: "en" | "ko" | "zh" | "ja" | "es" | "hi" | "ar";
  additionalDetails: AiDetail[];
  photos: PhotoForAi[];
  currentDescription: string;
  hasPreviousDescription: boolean;
  onUseDraft: (description: string, mode: "append" | "replace") => void;
  onUseTitle: (title: string) => void;
  onRestorePreviousDescription: () => void;
};

const MAX_AI_IMAGE_DIMENSION = 1600;
const MAX_AI_IMAGES = 3;
const AI_REQUEST_TIMEOUT_MS = 65_000;

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
  const draft = data as Record<string, unknown>;
  const nullableStrings = [
    draft.category,
    draft.subcategory,
    draft.brand,
    draft.model,
    draft.colour,
    draft.reviewReason,
  ];
  const conditions = new Set(["New", "Like New", "Good", "Fair", "For Parts", "Unknown"]);
  const confidenceLevels = new Set(["low", "medium", "high"]);
  if (
    typeof draft.title !== "string"
    || draft.title.length < 1
    || draft.title.length > 70
    || typeof draft.description !== "string"
    || typeof draft.condition !== "string"
    || !conditions.has(draft.condition)
    || typeof draft.conditionReason !== "string"
    || !nullableStrings.every((value) => value === null || typeof value === "string")
    || !Array.isArray(draft.keyFeatures)
    || !draft.keyFeatures.every((item) => typeof item === "string")
    || !Array.isArray(draft.visibleDefects)
    || !draft.visibleDefects.every((item) => typeof item === "string")
    || !Array.isArray(draft.includedItems)
    || !draft.includedItems.every((item) => typeof item === "string")
    || !Array.isArray(draft.suggestedSearchKeywords)
    || !draft.suggestedSearchKeywords.every((item) => typeof item === "string")
    || !Array.isArray(draft.missingInformation)
    || !draft.missingInformation.every((item) => typeof item === "string")
    || typeof draft.requiresManualReview !== "boolean"
    || typeof draft.confidence !== "string"
    || !confidenceLevels.has(draft.confidence)
  ) return null;
  return draft as GeneratedListing;
}

function isFallbackDraft(payload: unknown) {
  if (typeof payload !== "object" || !payload || !("fallback" in payload)) return false;
  return (payload as Record<string, unknown>).fallback === true;
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

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
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
  language,
  additionalDetails,
  photos,
  currentDescription,
  hasPreviousDescription,
  onUseDraft,
  onUseTitle,
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
    if (!description && !title.trim() && photos.length === 0) {
      setError(language === "ko" ? "제목, 설명, 사진 중 하나를 먼저 추가해 주세요." : "Add a title, description, or photo before generating a draft.");
      return;
    }

    const numericPrice = Number(price.replace(/[^0-9.]/g, ""));
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError(language === "ko" ? "AI 설명 생성이 아직 설정되지 않았습니다." : "AI description generation is not configured yet.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus(language === "ko" ? "사진과 입력한 정보를 바탕으로 판매 설명을 다듬고 있어요..." : "AI is polishing your listing for buyers...");

    const uploadedPaths: string[] = [];
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(language === "ko" ? "AI 설명을 만들려면 먼저 로그인해 주세요." : "Please sign in before generating a description.");
        return;
      }

      const photosForAnalysis = [...photos]
        .sort((left, right) => Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary)))
        .slice(0, MAX_AI_IMAGES);

      for (const photo of photosForAnalysis) {
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
      const timeout = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch("/api/ai/generate-listing", {
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
            additionalDetails,
            imagePaths: uploadedPaths,
            language,
          }),
        });
      } finally {
        window.clearTimeout(timeout);
      }

      const payload: unknown = await response.json();
      const generated = getGeneratedListing(payload);
      if (!response.ok || !generated) {
        throw new Error(getErrorMessage(payload) ?? (language === "ko" ? "판매 설명을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." : "Unable to create a listing description. Please try again shortly."));
      }

      const fallbackDraft = isFallbackDraft(payload);
      setDraft(generated);
      setProgress(100);
      setStatus(fallbackDraft
        ? "ChatGPT is temporarily unavailable, so a starter draft was created from your details. Please review it before posting."
        : "AI draft is ready. Review and edit it before posting.");
      if (!fallbackDraft || generated.title.toLocaleLowerCase() !== "title needs review") onUseTitle(generated.title);
      onUseDraft(generated.description, "replace");
      await new Promise((resolve) => window.setTimeout(resolve, 180));
    } catch (generationError) {
      setStatus(null);
      setError(generationError instanceof Error && generationError.name === "AbortError"
        ? language === "ko" ? "AI 생성 시간이 길어졌습니다. 다시 시도해 주세요." : "AI generation took too long. Please try again."
        : generationError instanceof Error
          ? generationError.message
          : language === "ko" ? "판매 설명을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." : "Unable to create a listing description. Please try again shortly.");
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
          <div className="post-ai-progress" role="progressbar" aria-label={language === "ko" ? "AI 판매 설명 생성 중" : "Creating AI description"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span className="post-ai-progress-fill" style={{ width: `${progress}%` }} />
            <span className="post-ai-progress-label">{language === "ko" ? `AI 초안 생성 중 ${progress}%` : `Creating AI draft ${progress}%`}</span>
          </div>
        ) : (
          <button className="post-ai-generate-button" type="button" onClick={() => void generate()}>
            <i className="fa-brands fa-openai" aria-hidden="true" />
            <span>Generate a listing description with ChatGPT</span>
          </button>
        )}
        <p>{language === "ko" ? "사진과 입력한 정보를 바탕으로 설명을 다듬습니다. AI가 상품을 자동으로 등록하지는 않습니다." : "ChatGPT turns your listing details and photos into a clear, buyer-friendly description. It never posts your listing automatically."}</p>
      </div>

      <div className="post-ai-live-region" aria-live="polite" aria-atomic="true">
        {status && <p className="post-ai-status">{status}</p>}
        {error && <p className="post-ai-error" role="alert">{error}</p>}
      </div>

      {draft && (
        <aside className="post-ai-preview" aria-label={language === "ko" ? "AI 판매 설명 초안 미리보기" : "AI listing draft preview"}>
          <div className="post-ai-preview-heading">
            <span>{language === "ko" ? "AI 초안 미리보기" : "AI draft preview"}</span>
            {hasPreviousDescription && <button type="button" onClick={onRestorePreviousDescription}>{language === "ko" ? "이전 설명 복원" : "Restore previous description"}</button>}
          </div>
          <p><strong>{language === "ko" ? "제목:" : "Title:"}</strong> {draft.title}</p>
          <p><strong>{language === "ko" ? "상품 상태:" : "Condition:"}</strong> {draft.condition} — {draft.conditionReason}</p>
          {draft.suggestedSearchKeywords.length > 0 && <div className="post-ai-tags" aria-label={language === "ko" ? "추천 검색 태그" : "Suggested search tags"}>{draft.suggestedSearchKeywords.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          {draft.visibleDefects.length > 0 && <ul className="post-ai-warnings">{draft.visibleDefects.map((defect) => <li key={defect}>{defect}</li>)}</ul>}
          {draft.missingInformation.length > 0 && <ul className="post-ai-warnings">{draft.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul>}
          {draft.requiresManualReview && draft.reviewReason ? <p className="post-ai-error" role="status">{draft.reviewReason}</p> : null}
        </aside>
      )}
    </section>
  );
}
