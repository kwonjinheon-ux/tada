"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

type TextSizeSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

const MAX_TEXT_SIZE_STEP = 5;
const TEXT_SIZE_STEP = 0.04;

export function TextSizeSection({ title, children, className }: TextSizeSectionProps) {
  const [sizeStep, setSizeStep] = useState(0);
  const textScale = 1 + sizeStep * TEXT_SIZE_STEP;

  return (
    <section className={["text-size-section", className].filter(Boolean).join(" ")} style={{ "--text-scale": textScale } as CSSProperties}>
      <div className="text-size-section-header">
        <h2>{title}</h2>
        <div className="text-size-controls" aria-label={`${title} text size`}>
          <button type="button" aria-label="Decrease text size" disabled={sizeStep === 0} onClick={() => setSizeStep((value) => Math.max(0, value - 1))}>
            <i className="fa-solid fa-minus" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Increase text size" disabled={sizeStep === MAX_TEXT_SIZE_STEP} onClick={() => setSizeStep((value) => Math.min(MAX_TEXT_SIZE_STEP, value + 1))}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="text-size-section-content">{children}</div>
    </section>
  );
}
