"use client";

import { useEffect, useState } from "react";

type AiDetail = { label: string; value: string };

type GeneratedListing = {
  title: string;
  description: string;
  visibleDetails: string[];
  sellerConfirmation: string[];
};

type AiListingGeneratorProps = {
  title: string;
  description: string;
  price: string;
  condition: string;
  location: string;
  language: "en" | "ko" | "zh" | "ja" | "es" | "hi" | "ar";
  additionalDetails: AiDetail[];
  imagePaths: string[];
  isImagesProcessing: boolean;
  onUseDraft: (description: string, mode: "replace") => void;
  onUseTitle: (title: string) => void;
};

const AI_REQUEST_TIMEOUT_MS = 58_000;

function getErrorMessage(payload: unknown) {
  if (typeof payload !== "object" || !payload || !("error" in payload)) return null;
  const error = payload.error;
  return typeof error === "object" && error && "message" in error && typeof error.message === "string" ? error.message : null;
}

function getGeneratedListing(payload: unknown): GeneratedListing | null {
  if (typeof payload !== "object" || !payload || !("success" in payload) || payload.success !== true || !("data" in payload)) return null;
  const data = payload.data;
  if (typeof data !== "object" || !data) return null;
  const { title, description, visibleDetails, sellerConfirmation } = data as Record<string, unknown>;
  if (typeof title !== "string" || typeof description !== "string" || !Array.isArray(visibleDetails) || !visibleDetails.every((item) => typeof item === "string") || !Array.isArray(sellerConfirmation) || !sellerConfirmation.every((item) => typeof item === "string")) return null;
  return { title, description, visibleDetails, sellerConfirmation };
}

export function AiListingGenerator({
  title,
  description,
  price,
  condition,
  location,
  language,
  additionalDetails,
  imagePaths,
  isImagesProcessing,
  onUseDraft,
  onUseTitle,
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

    setProgress(10);
    const timer = window.setInterval(() => setProgress((current) => Math.min(92, current + Math.max(2, Math.ceil((92 - current) * 0.16)))), 900);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  const generate = async () => {
    if (!imagePaths.length) {
      setError("Add a clear main photo before generating your listing.");
      return;
    }
    if (isImagesProcessing) {
      setError("Your photos are still being prepared. Please wait a moment and try again.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus("Analysing your photos and writing a seller-ready listing…");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/ai/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
        body: JSON.stringify({
          title: title.trim(),
          description: description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
          price: price.trim(),
          condition: condition.trim(),
          location: location.trim(),
          additionalDetails,
          imagePaths,
          language,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const generated = getGeneratedListing(payload);
      if (!response.ok || !generated) throw new Error(getErrorMessage(payload) ?? "We could not create a photo-based draft. Please try again.");

      setDraft(generated);
      setProgress(100);
      setStatus("Your title and listing description are ready to review.");
      onUseTitle(generated.title);
      onUseDraft(generated.description, "replace");
    } catch (generationError) {
      setStatus(null);
      setError(generationError instanceof Error && generationError.name === "AbortError"
        ? "Generation took longer than expected. Your photos are still ready to use, so please try again."
        : generationError instanceof Error ? generationError.message : "We could not create a photo-based draft. Please try again.");
    } finally {
      window.clearTimeout(timeout);
      setIsGenerating(false);
    }
  };

  return (
    <section className="post-ai-generator" aria-label="AI listing generator">
      <div className="post-ai-action-row">
        {isGenerating ? (
          <div className="post-ai-progress" role="progressbar" aria-label="Creating listing draft" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span className="post-ai-progress-fill" style={{ width: `${progress}%` }} />
            <span className="post-ai-progress-label">Creating listing draft {progress}%</span>
          </div>
        ) : (
          <button className="post-ai-generate-button" type="button" onClick={() => void generate()} disabled={isImagesProcessing}>
            <span className="post-ai-gpt-mark" aria-hidden="true">GPT</span>
            <span>Generate title & description with ChatGPT</span>
          </button>
        )}
        <p>ChatGPT uses your title, price and any notes you have entered. If they are blank, it identifies the item from your photos and creates a natural seller-style draft. It never publishes automatically. AI is convenient, but it cannot replace the human touch that catches a buyer&apos;s eye.</p>
      </div>

      <div className="post-ai-live-region" aria-live="polite" aria-atomic="true">
        {status ? <p className="post-ai-status">{status}</p> : null}
        {error ? <p className="post-ai-error" role="alert">{error}</p> : null}
      </div>

      {draft ? (
        <aside className="post-ai-preview" aria-label="AI listing draft review">
          <div className="post-ai-preview-heading"><span>AI draft review</span></div>
          <p><strong>Title:</strong> {draft.title}</p>
          {draft.visibleDetails.length ? <div className="post-ai-tags" aria-label="Confirmed visible details">{draft.visibleDetails.map((detail) => <span key={detail}>{detail}</span>)}</div> : null}
          {draft.sellerConfirmation.length ? <ul className="post-ai-warnings">{draft.sellerConfirmation.map((detail) => <li key={detail}>Confirm before posting: {detail}</li>)}</ul> : null}
        </aside>
      ) : null}
    </section>
  );
}
