"use client";

import { useLanguage } from "@/components/LanguageProvider";

/** The tile a card shows where a photo would be. Two reasons share one recipe:
 *  `textOnly` for a listing or post published without pictures, and
 *  `imageUnavailable` for a picture that exists but failed to load. They used
 *  to share the same "Text Only" wording, which mislabelled every broken image
 *  as a deliberate choice by the author.
 *
 *  `compact` drops the caption on thumbnails too small to hold a word; the tile
 *  still names itself to assistive technology through its own aria-label. */
export function TextOnlyMedia({ className = "", reason = "textOnly", compact = false }: { className?: string; reason?: "textOnly" | "imageUnavailable"; compact?: boolean }) {
  const { t } = useLanguage();
  const label = t(reason);

  return (
    <span className={["text-only-media", `is-${reason}`, compact ? "is-compact" : "", className].filter(Boolean).join(" ")} role="img" aria-label={label}>
      <i className={`ms ${reason === "textOnly" ? "ms-description" : "ms-image"}`} aria-hidden="true" />
      <span className="text-only-media-label" aria-hidden="true">{label}</span>
    </span>
  );
}
