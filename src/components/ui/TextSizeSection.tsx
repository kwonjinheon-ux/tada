"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { marketDescriptionTextSizeResponseSchema } from "@/contracts/api";

type TextSizeSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
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
        <i className="fa-solid fa-minus" aria-hidden="true" />
      </button>
      <button type="button" aria-label="Increase text size" disabled={value === MAX_DESCRIPTION_TEXT_SIZE_STEP} onClick={() => onChange(1)}>
        <i className="fa-solid fa-plus" aria-hidden="true" />
      </button>
    </div>
  );
}

export function TextSizeSection({ title, children, className }: TextSizeSectionProps) {
  const [sizeStep, setSizeStep] = useState(0);
  const sizeStepRef = useRef(0);
  const hasLocalChange = useRef(false);
  const textScale = descriptionTextScale(sizeStep);

  useEffect(() => {
    let isCurrent = true;

    void fetch("/api/market/preferences/description-text-size", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json().catch(() => null);
        const parsed = marketDescriptionTextSizeResponseSchema.safeParse(payload?.data);
        return parsed.success ? parsed.data : null;
      })
      .then((preference) => {
        if (!isCurrent || hasLocalChange.current || !preference) return;
        sizeStepRef.current = preference.sizeStep;
        setSizeStep(preference.sizeStep);
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, []);

  const updateSizeStep = (change: -1 | 1) => {
    const nextStep = Math.min(MAX_DESCRIPTION_TEXT_SIZE_STEP, Math.max(0, sizeStepRef.current + change));
    if (nextStep === sizeStepRef.current) return;

    hasLocalChange.current = true;
    sizeStepRef.current = nextStep;
    setSizeStep(nextStep);
    void fetch("/api/market/preferences/description-text-size", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sizeStep: nextStep }),
    }).catch(() => undefined);
  };

  return (
    <section className={["text-size-section", className].filter(Boolean).join(" ")} style={{ "--text-scale": textScale } as CSSProperties}>
      <div className="text-size-section-header">
        <h2>{title}</h2>
        <TextSizeControls value={sizeStep} onChange={updateSizeStep} label={`${title} text size`} />
      </div>
      <div className="text-size-section-content">{children}</div>
    </section>
  );
}
