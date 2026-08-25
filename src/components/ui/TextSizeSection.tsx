"use client";

import { type CSSProperties, type ReactNode } from "react";

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
};

export const MAX_DESCRIPTION_TEXT_SIZE_STEP = 5;
export const DESCRIPTION_TEXT_SIZE_STEP = 0.2;

export function descriptionTextScale(sizeStep: number) {
  return 1 + sizeStep * DESCRIPTION_TEXT_SIZE_STEP;
}

export function TextSizeControls({ value, onChange, label }: TextSizeControlsProps) {
  return (
    <div className="text-size-controls" aria-label={label}>
      <button type="button" aria-label="Decrease text size" disabled={value === 0} onClick={() => onChange(-1)}>
        <i className="ms ms-remove" aria-hidden="true" />
      </button>
      <button type="button" aria-label="Increase text size" disabled={value === MAX_DESCRIPTION_TEXT_SIZE_STEP} onClick={() => onChange(1)}>
        <i className="ms ms-add" aria-hidden="true" />
      </button>
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
