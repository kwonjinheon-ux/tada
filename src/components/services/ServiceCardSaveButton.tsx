"use client";

import { useState, type ReactNode } from "react";
import { renderServiceCardFile, saveServiceCardFile, serviceCardFile, type ServiceCardContent, type ServiceCardFormat, type ServiceCardSaveResult } from "@/lib/media/service-card-image";

type ServiceCardSaveButtonProps = {
  content: ServiceCardContent;
  format: ServiceCardFormat;
  className?: string;
  children?: ReactNode;
  /** A preview already has the drawing on screen; saving hands over that exact
   *  canvas rather than redrawing, so the file cannot differ from what is
   *  being looked at. Callers with nothing on show leave this out. */
  canvas?: HTMLCanvasElement | null;
  onResult?: (result: ServiceCardSaveResult) => void;
};

/** One save path for every place a provider card can be kept: the directory
 *  card, the profile rail and the create-page preview all come through here. */
export function ServiceCardSaveButton({ content, format, className = "", children, canvas, onResult }: ServiceCardSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const busyLabel = content.isKorean ? "이미지 준비 중…" : "Preparing image…";

  const save = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const file = canvas ? await serviceCardFile(canvas, content.businessName, format) : await renderServiceCardFile(content, format);
      // Save first, then report. `onResult?.(await save(...))` short-circuits
      // the whole expression when no callback is passed — argument included —
      // so the button silently rendered the image and threw it away.
      const result = await saveServiceCardFile(file, content.businessName);
      onResult?.(result);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      className={className}
      type="button"
      disabled={isSaving}
      aria-label={content.isKorean ? `${content.businessName} 명함 이미지 저장` : `Save ${content.businessName} card image`}
      onClick={(event) => { event.stopPropagation(); void save(); }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {isSaving ? <span>{busyLabel}</span> : children}
    </button>
  );
}
