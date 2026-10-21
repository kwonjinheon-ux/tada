"use client";

import { type CSSProperties, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";

type TextSizeSectionProps = {
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
  className?: string;
  sizeStep?: number;
};

type TextSizeControlsProps = {
  value: number;
  onChange: (change: -1 | 1) => void;
  label: string;
  locale?: string;
  showValue?: boolean;
};

export const MAX_DESCRIPTION_TEXT_SIZE_STEP = 5;
export const DESCRIPTION_TEXT_SIZE_STEP = 0.2;

export function descriptionTextScale(sizeStep: number) {
  return 1 + sizeStep * DESCRIPTION_TEXT_SIZE_STEP;
}

export function TextSizeControls({ value, onChange, label, locale, showValue }: TextSizeControlsProps) {
  return (
    <div className={`text-size-controls${showValue ? " text-size-controls--value" : ""}`} aria-label={label}>
      <IconButton aria-label={locale === "ko" ? "글씨 작게" : "Decrease text size"} disabled={value === 0} onClick={() => onChange(-1)}>
        <i className="ms ms-remove" aria-hidden="true" />
      </IconButton>
      {showValue ? <output aria-live="polite">{Math.round(descriptionTextScale(value) * 100)}%</output> : null}
      <IconButton aria-label={locale === "ko" ? "글씨 크게" : "Increase text size"} disabled={value === MAX_DESCRIPTION_TEXT_SIZE_STEP} onClick={() => onChange(1)}>
        <i className="ms ms-add" aria-hidden="true" />
      </IconButton>
    </div>
  );
}

export function TextSizePreferencePreview({ value, onChange, locale, variant = "default" }: { value: number; onChange: (change: -1 | 1) => void; locale: string; variant?: "default" | "settings" }) {
  const isKorean = locale === "ko";
  if (variant === "settings") return <div className="profile-description-text-size-preview profile-description-text-size-preview--settings"><TextSizeControls value={value} label={isKorean ? "상품 설명 글씨 크기" : "Listing description text size"} locale={locale} showValue onChange={onChange} /><p style={{ "--text-scale": descriptionTextScale(value) } as CSSProperties}>{isKorean ? "상품 설명이 이 크기로 표시됩니다." : "Listing descriptions will appear at this size."}</p></div>;
  return (
    <div className="profile-description-text-size-preview">
      <div>
        <span aria-live="polite">{isKorean ? "미리보기" : "Preview"} · {Math.round(descriptionTextScale(value) * 100)}%</span>
        <p style={{ "--text-scale": descriptionTextScale(value) } as CSSProperties}>
          {isKorean ? "상품 설명이 이 크기로 표시됩니다." : "Listing descriptions will appear at this size."}
        </p>
      </div>
      <TextSizeControls value={value} label={isKorean ? "상품 설명 글씨 크기" : "Listing description text size"} locale={locale} onChange={onChange} />
    </div>
  );
}

export function TextSizeSection({ title, children, headerAction, className, sizeStep = 0 }: TextSizeSectionProps) {
  const textScale = descriptionTextScale(sizeStep);

  return (
    <section className={["text-size-section", className].filter(Boolean).join(" ")} style={{ "--text-scale": textScale } as CSSProperties}>
      <div className="text-size-section-header">
        <h2>{title}</h2>
        {headerAction}
      </div>
      <div className="text-size-section-content">{children}</div>
    </section>
  );
}
